/**
 * RemoteViewManager - Renderer-side WebRTC screen sharing
 * 
 * This MUST run in the renderer process because:
 * 1. RTCPeerConnection is a browser API (doesn't exist in Node/main process)
 * 2. MediaStream cannot be serialized over IPC
 * 3. getUserMedia with chromeMediaSource only works in Chromium renderer
 */

import Peer from 'simple-peer';
import type { 
  StreamQuality, 
  SignalData, 
  RemoteInput, 
  ViewportInfo 
} from './types';

interface ViewerSession {
  clientId: string;
  browserId: string;
  quality: StreamQuality;
  peer: Peer.Instance;
}

interface PendingViewer {
  clientId: string;
  browserId: string;
  quality: StreamQuality;
}

type SignalCallback = (clientId: string, signal: SignalData) => void;

export class RemoteViewManager {
  private stream: MediaStream | null = null;
  private sessions: Map<string, ViewerSession> = new Map();
  private pendingViewers: PendingViewer[] = [];
  private onSignalCallback: SignalCallback | null = null;
  private currentSourceId: string | null = null;
  private isCapturing = false;

  /**
   * Initialize capture with a specific source
   * Returns a promise that resolves when capture is ready
   */
  async startCapture(sourceId: string, quality: StreamQuality): Promise<void> {
    // Prevent concurrent capture attempts
    if (this.isCapturing) {
      console.log('[RemoteViewManager] Capture already in progress, waiting...');
      return;
    }
    
    // If already capturing this source, reuse
    if (this.stream && this.currentSourceId === sourceId) {
      console.log('[RemoteViewManager] Reusing existing capture');
      return;
    }

    this.isCapturing = true;
    
    try {
      // Stop existing capture
      this.stopCapture();

      const preset = this.getQualityPreset(quality);

      console.log(`[RemoteViewManager] Starting capture with sourceId: ${sourceId}`);
      console.log(`[RemoteViewManager] Quality preset: ${quality} (${preset.width}x${preset.height}@${preset.frameRate}fps)`);

      // Create MediaStream using Electron's chromeMediaSource
      // This ONLY works in renderer process!
      // NOTE: audio MUST be false - chromeMediaSource constraint doesn't support audio capture
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: preset.width,
            maxHeight: preset.height,
            maxFrameRate: preset.frameRate
          }
        } as MediaTrackConstraints  // Cast needed - mandatory is Chrome-specific, not in TS types
      });

      // Check if we actually got video tracks
      const videoTracks = this.stream.getVideoTracks();
      console.log(`[RemoteViewManager] Got ${videoTracks.length} video tracks`);

      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        console.log(`[RemoteViewManager] Track settings:`, settings);
        console.log(`[RemoteViewManager] Track muted: ${track.muted}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      }

      this.currentSourceId = sourceId;
      console.log('[RemoteViewManager] Capture started successfully');

      // Process any pending viewers that were waiting for capture
      this.processPendingViewers();
      
    } finally {
      this.isCapturing = false;
    }
  }

  /**
   * Stop capture and release resources
   */
  stopCapture(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.currentSourceId = null;
    }
  }

  /**
   * Handle a new viewer connection request
   * If capture isn't ready, queues the viewer for later
   * @param sourceId - Optional pre-retrieved source ID (for shadow browsers)
   */
  async handleViewerConnect(clientId: string, browserId: string, quality: StreamQuality, sourceId?: string): Promise<void> {
    // If stream not ready, queue this viewer
    if (!this.stream) {
      console.log(`[RemoteViewManager] Stream not ready, queueing viewer ${clientId}`);
      this.pendingViewers.push({ clientId, browserId, quality });

      // Use provided sourceId if available (shadow browsers provide this to skip redundant lookup)
      if (sourceId) {
        console.log(`[RemoteViewManager] Using provided source ID: ${sourceId}`);
        await this.startCapture(sourceId, quality);
      } else {
        // Otherwise fetch it (for regular BrowserViews)
        console.log(`[RemoteViewManager] Getting media source for browser: "${browserId}"`);
        const source = await window.remoteView.getBrowserSource(browserId);
        if (source) {
          console.log(`[RemoteViewManager] Got media source ID: ${source.id}`);
          await this.startCapture(source.id, quality);
        } else {
          console.error('[RemoteViewManager] No source found for browser:', browserId);
        }
      }
      return;
    }

    this.createPeerForViewer(clientId, browserId, quality);
  }
  
  /**
   * Process viewers that were waiting for capture to be ready
   */
  private processPendingViewers(): void {
    if (!this.stream || this.pendingViewers.length === 0) return;
    
    console.log(`[RemoteViewManager] Processing ${this.pendingViewers.length} pending viewers`);
    
    const pending = [...this.pendingViewers];
    this.pendingViewers = [];
    
    for (const viewer of pending) {
      this.createPeerForViewer(viewer.clientId, viewer.browserId, viewer.quality);
    }
  }
  
  /**
   * Create a peer connection for a viewer (internal, assumes stream is ready)
   */
  private createPeerForViewer(clientId: string, browserId: string, quality: StreamQuality): void {
    if (!this.stream) {
      console.error('[RemoteViewManager] Cannot create peer - no stream');
      return;
    }
    
    // Don't create duplicate sessions
    if (this.sessions.has(clientId)) {
      console.warn(`[RemoteViewManager] Session already exists for ${clientId}`);
      return;
    }

    // Create SimplePeer as the initiator (we have the stream)
    const peer = new Peer({
      initiator: true,
      stream: this.stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      },
      // Control bitrate based on quality setting (in kbps)
      sdpTransform: (sdp: string) => {
        const bitrate = this.getQualityBitrate(quality);
        return sdp.replace(/b=AS:\d+/g, `b=AS:${bitrate}`);
      }
    });

    // Handle outgoing signals → send to mobile via main process
    peer.on('signal', (data) => {
      const signal: SignalData = {
        type: this.getSignalType(data),
        data
      };
      
      if (this.onSignalCallback) {
        this.onSignalCallback(clientId, signal);
      }
    });

    // Handle incoming data (input events from mobile)
    peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'input') {
          this.handleRemoteInput(browserId, message.input, message.viewport);
        }
      } catch (err) {
        console.error('[RemoteViewManager] Failed to parse data:', err);
      }
    });

    peer.on('connect', () => {
      console.log(`[RemoteViewManager] Peer connected: ${clientId}`);
    });

    peer.on('close', () => {
      console.log(`[RemoteViewManager] Peer disconnected: ${clientId}`);
      this.sessions.delete(clientId);
    });

    peer.on('error', (err) => {
      console.error(`[RemoteViewManager] Peer error for ${clientId}:`, err);
      this.sessions.delete(clientId);
    });

    this.sessions.set(clientId, { clientId, browserId, quality, peer });
  }

  /**
   * Handle incoming WebRTC signal from mobile (via main process)
   */
  handleSignal(clientId: string, signal: SignalData): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.peer.signal(signal.data);
    } else {
      console.warn(`[RemoteViewManager] No session for client: ${clientId}`);
    }
  }

  /**
   * Disconnect a specific viewer
   */
  disconnectViewer(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (session) {
      session.peer.destroy();
      this.sessions.delete(clientId);
    }
    
    // Also remove from pending if queued
    this.pendingViewers = this.pendingViewers.filter(v => v.clientId !== clientId);
  }

  /**
   * Disconnect all viewers
   */
  disconnectAll(): void {
    for (const session of this.sessions.values()) {
      session.peer.destroy();
    }
    this.sessions.clear();
    this.pendingViewers = [];
  }

  /**
   * Set callback for outgoing signals
   */
  onSignal(callback: SignalCallback): void {
    this.onSignalCallback = callback;
  }

  /**
   * Handle remote input by forwarding to main process
   */
  private async handleRemoteInput(browserId: string, input: RemoteInput, viewport: ViewportInfo): Promise<void> {
    // Call main process to inject input into BrowserView
    await window.remoteView.injectInput(browserId, input, viewport);
  }

  /**
   * Get quality preset values
   */
  private getQualityPreset(quality: StreamQuality) {
    const presets = {
      low: { width: 854, height: 480, frameRate: 15 },
      medium: { width: 1280, height: 720, frameRate: 30 },
      high: { width: 1920, height: 1080, frameRate: 60 }
    };
    return presets[quality];
  }

  /**
   * Get bitrate for quality setting (in kbps)
   */
  private getQualityBitrate(quality: StreamQuality): number {
    const bitrates = {
      low: 500,
      medium: 2000,
      high: 5000
    };
    return bitrates[quality];
  }

  /**
   * Determine signal type from SimplePeer signal
   */
  private getSignalType(data: Peer.SignalData): 'offer' | 'answer' | 'candidate' {
    if ('type' in data) {
      if (data.type === 'offer') return 'offer';
      if (data.type === 'answer') return 'answer';
    }
    return 'candidate';
  }

  /**
   * Get active session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if capture is active
   */
  hasActiveCapture(): boolean {
    return this.stream !== null;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.disconnectAll();
    this.stopCapture();
    this.onSignalCallback = null;
  }
}

// Singleton instance for the renderer
let instance: RemoteViewManager | null = null;

export function getRemoteViewManager(): RemoteViewManager {
  if (!instance) {
    instance = new RemoteViewManager();
  }
  return instance;
}
