# Maestro Remote View - Implementation Spec

## Overview

Add WebRTC-based screen streaming to Maestro, allowing users to view and control browser tabs from their mobile device.

**Critical Architecture Constraint:** WebRTC (RTCPeerConnection, MediaStream) can ONLY exist in Electron's renderer process. The main process cannot create or handle media streams. This spec is structured accordingly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN PROCESS                                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ Source          │  │ Input           │  │ WebSocket Server            │ │
│  │ Enumerator      │  │ Injector        │  │ (Signaling Relay)           │ │
│  │                 │  │                 │  │                             │ │
│  │ getSources()    │  │ sendInputEvent()│  │ Forwards signals between    │ │
│  │ returns IDs     │  │ into BrowserView│  │ desktop renderer & mobile   │ │
│  └────────┬────────┘  └────────▲────────┘  └──────────┬──────────────────┘ │
│           │                    │                      │                     │
└───────────┼────────────────────┼──────────────────────┼─────────────────────┘
            │ IPC                 │ IPC                  │ WebSocket
            │ (source IDs)        │ (input events)       │ (signals)
            ▼                    │                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             RENDERER PROCESS                                  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        RemoteViewManager                                 │ │
│  │                                                                          │ │
│  │   1. Receives source ID from main                                        │ │
│  │   2. Calls getUserMedia({ chromeMediaSourceId }) → MediaStream          │ │
│  │   3. Creates SimplePeer with stream                                      │ │
│  │   4. Handles signaling via IPC ↔ WebSocket                              │ │
│  │   5. Receives input from data channel → sends to main for injection     │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ WebRTC (Video + DataChannel)
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              MOBILE CLIENT                                    │
│                                                                               │
│   SimplePeer (receiver) → <video> element                                    │
│   Touch events → DataChannel → Desktop                                        │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Install Dependencies

```bash
pnpm add simple-peer
pnpm add -D @types/simple-peer
```

---

## File Structure

Create these new files:

```
src/
├── ipc/
│   └── remote-view.ts                    # NEW: Main process IPC handlers
├── renderer/
│   └── remote-view/                      # NEW: Renderer-side WebRTC manager
│       ├── index.ts                      # RemoteViewManager class
│       └── types.ts                      # Shared types
├── services/
│   └── remote-server/
│       └── websocket/
│           └── handler.ts                # MODIFY: Add remote-view message handlers
├── types/
│   └── remote-view.d.ts                  # NEW: Window type declarations
├── preload.ts                            # MODIFY: Add remote-view API
├── main.ts                               # MODIFY: Register handlers, wire up wsManager
├── App.tsx                               # MODIFY: Initialize RemoteViewManager
└── mobile/
    ├── App.tsx                           # MODIFY: Add route
    ├── screens/
    │   └── RemoteView.tsx                # NEW: Browser selection + viewer
    └── components/
        └── remote-view/
            ├── RemoteViewer.tsx          # NEW: Video + WebRTC client
            ├── TouchOverlay.tsx          # NEW: Touch → mouse translation
            └── ViewerControls.tsx        # NEW: Quality, disconnect
```

---

## Type Definitions

### FILE: src/renderer/remote-view/types.ts

```typescript
// =============================================================================
// Remote View Types
// =============================================================================

/**
 * Quality preset for video streaming
 */
export type StreamQuality = 'low' | 'medium' | 'high';

export const QUALITY_PRESETS: Record<StreamQuality, {
  width: number;
  height: number;
  frameRate: number;
}> = {
  low: { width: 854, height: 480, frameRate: 15 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  high: { width: 1920, height: 1080, frameRate: 60 },
};

/**
 * Serializable source info (safe to pass over IPC)
 */
export interface CaptureSource {
  id: string;
  name: string;
  thumbnail?: string; // Base64 data URL
}

/**
 * Information about a viewable browser tab
 */
export interface ViewableBrowser {
  id: string;
  label: string;
  url: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Remote input event from mobile client
 */
export interface RemoteInput {
  type: 'click' | 'rightclick' | 'doubleclick' | 'scroll' | 'key' | 'move';
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

/**
 * Viewport information for coordinate mapping
 */
export interface ViewportInfo {
  /** Width of the video element on mobile */
  remoteWidth: number;
  /** Height of the video element on mobile */
  remoteHeight: number;
  /** Actual bounds of the target BrowserView */
  viewBounds: {
    width: number;
    height: number;
  };
}

/**
 * WebRTC signaling data (serializable)
 */
export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  data: unknown;
}

// =============================================================================
// IPC Message Types
// =============================================================================

export interface RemoteViewIPCAPI {
  // Main process provides these
  getSources: () => Promise<CaptureSource[]>;
  getBrowsers: () => Promise<ViewableBrowser[]>;
  getBrowserBounds: (browserId: string) => Promise<{ width: number; height: number }>;
  injectInput: (browserId: string, input: RemoteInput, viewport: ViewportInfo) => Promise<boolean>;
  
  // Signaling relay
  sendSignal: (clientId: string, signal: SignalData) => void;
  onSignal: (callback: (clientId: string, signal: SignalData) => void) => () => void;
  onViewerConnected: (callback: (clientId: string, browserId: string, quality: StreamQuality) => void) => () => void;
  onViewerDisconnected: (callback: (clientId: string) => void) => () => void;
}

// =============================================================================
// WebSocket Message Types (Mobile ↔ Server)
// =============================================================================

export interface WS_RemoteViewList {
  type: 'remote-view:list';
}

export interface WS_RemoteViewListResponse {
  type: 'remote-view:list';
  browsers: ViewableBrowser[];
}

export interface WS_RemoteViewStart {
  type: 'remote-view:start';
  browserId: string;
  quality: StreamQuality;
}

export interface WS_RemoteViewStarted {
  type: 'remote-view:started';
  browserId: string;
  bounds: { width: number; height: number };
}

export interface WS_RemoteViewSignal {
  type: 'remote-view:signal';
  signal: SignalData;
}

export interface WS_RemoteViewInput {
  type: 'remote-view:input';
  input: RemoteInput;
  viewport: ViewportInfo;
}

export interface WS_RemoteViewStop {
  type: 'remote-view:stop';
}

export interface WS_RemoteViewError {
  type: 'remote-view:error';
  error: string;
  code: 'NOT_FOUND' | 'CAPTURE_FAILED' | 'CONNECTION_FAILED';
}
```

---

## Main Process: IPC Handlers

### FILE: src/ipc/remote-view.ts

```typescript
import { ipcMain, desktopCapturer, BrowserWindow, BrowserView } from 'electron';
import type { RemoteInput, ViewportInfo, CaptureSource, ViewableBrowser } from '../renderer/remote-view/types';
import { getBrowserViewsMap } from './browser';

type InputButton = 'left' | 'right' | 'middle';
type ElectronModifier = 'control' | 'alt' | 'shift' | 'meta';

// =============================================================================
// Input Injection (Exported for direct use by WebSocket handler)
// =============================================================================

/**
 * Inject input into a BrowserView
 * Exported so WebSocket handler can call directly without IPC round-trip
 */
export function injectInputIntoBrowser(
  browserId: string,
  input: RemoteInput,
  viewport: ViewportInfo,
  getMainWindow: () => BrowserWindow | null
): boolean {
  const viewsMap = getBrowserViewsMap();
  const viewInfo = viewsMap.get(browserId);
  
  if (!viewInfo) {
    console.warn(`[RemoteView] BrowserView ${browserId} not found`);
    return false;
  }

  const view = viewInfo.view;
  const mainWindow = getMainWindow();

  // Ensure window is focused for input injection
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.focus();
  }

  // Map coordinates from mobile viewport to BrowserView
  const mappedX = Math.round((input.x || 0) * (viewport.viewBounds.width / viewport.remoteWidth));
  const mappedY = Math.round((input.y || 0) * (viewport.viewBounds.height / viewport.remoteHeight));

  try {
    switch (input.type) {
      case 'click':
        injectClick(view, mappedX, mappedY, 'left', 1);
        break;
      case 'doubleclick':
        injectClick(view, mappedX, mappedY, 'left', 2);
        break;
      case 'rightclick':
        injectClick(view, mappedX, mappedY, 'right', 1);
        break;
      case 'scroll':
        injectScroll(view, mappedX, mappedY, input.deltaX, input.deltaY);
        break;
      case 'key':
        if (input.key) {
          injectKey(view, input.key, input.modifiers);
        }
        break;
      case 'move':
        injectMouseMove(view, mappedX, mappedY);
        break;
    }
    return true;
  } catch (err) {
    console.error('[RemoteView] Input injection failed:', err);
    return false;
  }
}

// =============================================================================
// IPC Handlers
// =============================================================================

/**
 * Register Remote View IPC handlers
 * 
 * Main process responsibilities:
 * 1. Enumerate capture sources (returns IDs only - no MediaStream!)
 * 2. List available browser tabs
 * 3. Inject input events into BrowserViews
 * 4. Relay WebRTC signals (renderer ↔ mobile via WebSocket)
 */
export function registerRemoteViewHandlers(getMainWindow: () => BrowserWindow | null): void {
  
  // =========================================================================
  // Source Enumeration
  // =========================================================================
  
  /**
   * Get available capture sources
   * Returns serializable data only - source IDs, names, thumbnails
   */
  ipcMain.handle('remote-view:get-sources', async (): Promise<CaptureSource[]> => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 }
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  });

  /**
   * Get the Maestro window source specifically
   */
  ipcMain.handle('remote-view:get-maestro-source', async (): Promise<CaptureSource | null> => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 320, height: 180 }
    });

    const maestro = sources.find(s => s.name === 'Maestro' || s.name.includes('Maestro'));
    if (!maestro) return null;

    return {
      id: maestro.id,
      name: maestro.name,
      thumbnail: maestro.thumbnail.toDataURL()
    };
  });

  // =========================================================================
  // Browser Tab Listing
  // =========================================================================

  /**
   * Get list of browser tabs that can be viewed
   */
  ipcMain.handle('remote-view:get-browsers', async (): Promise<ViewableBrowser[]> => {
    const viewsMap = getBrowserViewsMap();
    const browsers: ViewableBrowser[] = [];

    for (const [label, { view }] of viewsMap) {
      try {
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        const bounds = view.getBounds();

        browsers.push({
          id: label,
          label,
          url,
          title,
          bounds
        });
      } catch {
        // View might be destroyed, skip
      }
    }

    return browsers;
  });

  /**
   * Get bounds of a specific browser
   */
  ipcMain.handle('remote-view:get-browser-bounds', async (_event, browserId: string): Promise<{ width: number; height: number } | null> => {
    const viewsMap = getBrowserViewsMap();
    const viewInfo = viewsMap.get(browserId);
    
    if (!viewInfo) return null;
    
    const bounds = viewInfo.view.getBounds();
    return { width: bounds.width, height: bounds.height };
  });

  // =========================================================================
  // Input Injection (IPC version - used by renderer)
  // =========================================================================

  /**
   * Inject input event into a BrowserView (called from renderer)
   */
  ipcMain.handle('remote-view:inject-input', async (
    _event,
    browserId: string,
    input: RemoteInput,
    viewport: ViewportInfo
  ): Promise<boolean> => {
    return injectInputIntoBrowser(browserId, input, viewport, getMainWindow);
  });
}

// =============================================================================
// Input Injection Helpers
// =============================================================================

function injectClick(view: BrowserView, x: number, y: number, button: InputButton, clickCount: number): void {
  view.webContents.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount });
  view.webContents.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount });
}

function injectScroll(view: BrowserView, x: number, y: number, deltaX?: number, deltaY?: number): void {
  view.webContents.sendInputEvent({
    type: 'mouseWheel',
    x,
    y,
    deltaX: deltaX || 0,
    deltaY: deltaY || 0
  });
}

function injectKey(view: BrowserView, keyCode: string, modifiers?: string[]): void {
  const electronMods = (modifiers || []).map(m => m === 'ctrl' ? 'control' : m) as ElectronModifier[];
  
  (['keyDown', 'char', 'keyUp'] as const).forEach(type => {
    view.webContents.sendInputEvent({
      type,
      keyCode,
      modifiers: electronMods
    } as Electron.KeyboardInputEvent);
  });
}

function injectMouseMove(view: BrowserView, x: number, y: number): void {
  view.webContents.sendInputEvent({ type: 'mouseMove', x, y } as Electron.MouseInputEvent);
}

// =============================================================================
// Cleanup
// =============================================================================

export function cleanupRemoteViewHandlers(): void {
  ipcMain.removeHandler('remote-view:get-sources');
  ipcMain.removeHandler('remote-view:get-maestro-source');
  ipcMain.removeHandler('remote-view:get-browsers');
  ipcMain.removeHandler('remote-view:get-browser-bounds');
  ipcMain.removeHandler('remote-view:inject-input');
}
```

---

## Renderer Process: WebRTC Manager

### FILE: src/renderer/remote-view/index.ts

```typescript
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
  private isCapturing: boolean = false;

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

      this.currentSourceId = sourceId;
      console.log('[RemoteViewManager] Capture started');
      
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
   */
  async handleViewerConnect(clientId: string, browserId: string, quality: StreamQuality): Promise<void> {
    // If stream not ready, queue this viewer
    if (!this.stream) {
      console.log(`[RemoteViewManager] Stream not ready, queueing viewer ${clientId}`);
      this.pendingViewers.push({ clientId, browserId, quality });
      
      // Try to start capture
      const source = await window.remoteView.getMaestroSource();
      if (source) {
        await this.startCapture(source.id, quality);
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
```

---

## Update Preload Script

### MODIFY: src/preload.ts

Add the remote view API:

```typescript
// Add to existing preload.ts

// =============================================================================
// Remote View API
// =============================================================================

contextBridge.exposeInMainWorld('remoteView', {
  // Get available capture sources (screen, windows)
  getSources: () => ipcRenderer.invoke('remote-view:get-sources'),
  
  // Get the Maestro window source specifically
  getMaestroSource: () => ipcRenderer.invoke('remote-view:get-maestro-source'),
  
  // Get list of browser tabs
  getBrowsers: () => ipcRenderer.invoke('remote-view:get-browsers'),
  
  // Get bounds of a specific browser
  getBrowserBounds: (browserId: string) => 
    ipcRenderer.invoke('remote-view:get-browser-bounds', browserId),
  
  // Inject input into a browser (called from renderer when receiving remote input)
  injectInput: (browserId: string, input: unknown, viewport: unknown) =>
    ipcRenderer.invoke('remote-view:inject-input', browserId, input, viewport),
  
  // Signaling: send signal to mobile client (renderer → main → WebSocket)
  sendSignal: (clientId: string, signal: unknown) => {
    ipcRenderer.send('remote-view:signal-out', clientId, signal);
  },
  
  // Signaling: receive signal from mobile client (WebSocket → main → renderer)
  onSignal: (callback: (clientId: string, signal: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, clientId: string, signal: unknown) => {
      callback(clientId, signal);
    };
    ipcRenderer.on('remote-view:signal-in', handler);
    return () => ipcRenderer.removeListener('remote-view:signal-in', handler);
  },
  
  // Viewer connected (mobile requested to start viewing)
  onViewerConnected: (callback: (clientId: string, browserId: string, quality: string) => void) => {
    const handler = (_event: IpcRendererEvent, clientId: string, browserId: string, quality: string) => {
      callback(clientId, browserId, quality);
    };
    ipcRenderer.on('remote-view:viewer-connected', handler);
    return () => ipcRenderer.removeListener('remote-view:viewer-connected', handler);
  },
  
  // Viewer disconnected
  onViewerDisconnected: (callback: (clientId: string) => void) => {
    const handler = (_event: IpcRendererEvent, clientId: string) => {
      callback(clientId);
    };
    ipcRenderer.on('remote-view:viewer-disconnected', handler);
    return () => ipcRenderer.removeListener('remote-view:viewer-disconnected', handler);
  },
});
```

---

## Update Main Process

### MODIFY: src/main.ts

```typescript
// Add to imports
import { registerRemoteViewHandlers, cleanupRemoteViewHandlers } from './ipc/remote-view';
import { wsManager } from './services/remote-server/websocket/handler';
import { getBrowserViewsMap } from './ipc/browser';

// In app.on('ready', ...) after createWindow() and registerBrowserHandlers():

// Register remote view IPC handlers
registerRemoteViewHandlers(getMainWindow);

// Give WebSocket manager access to main window and browser views for remote view
wsManager.setRemoteViewDependencies(getMainWindow, getBrowserViewsMap);

// In cleanup:
app.on('window-all-closed', () => {
  cleanupRemoteViewHandlers();
  // ... existing cleanup
});
```

---

## WebSocket Server: Signaling Relay

### MODIFY: src/services/remote-server/websocket/handler.ts

The WSManager needs access to main window for IPC communication with renderer, and to the browser views map for getting browser info. Update the class:

```typescript
import { WebSocket } from 'ws';
import crypto from 'crypto';
import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import { verifyAccessToken } from '../auth/token';
import { getDevice, updateLastSeen } from '../auth/device-registry';
import { envelope, WSEnvelope } from './protocol';
import { terminalBridge } from '../terminal/bridge';
import { injectInputIntoBrowser } from '../../ipc/remote-view';
import type { RemoteInput, ViewportInfo } from '../../renderer/remote-view/types';

// ... existing WSClient interface ...

class WSManager {
  private clients = new Map<string, WSClient>();
  private pingInterval: NodeJS.Timeout | null = null;
  private getMainWindow: (() => BrowserWindow | null) | null = null;
  private getBrowserViewsMap: (() => Map<string, { view: BrowserView; label: string }>) | null = null;
  
  constructor() {
    this.pingInterval = setInterval(() => this.pingAll(), 30_000);
  }
  
  // ADD: Set dependencies for remote view
  setRemoteViewDependencies(
    getMainWindow: () => BrowserWindow | null,
    getBrowserViewsMap: () => Map<string, { view: BrowserView; label: string }>
  ) {
    this.getMainWindow = getMainWindow;
    this.getBrowserViewsMap = getBrowserViewsMap;
    this.setupIPCListeners();
  }
  
  // ADD: Listen for signals from renderer to forward to mobile
  private setupIPCListeners() {
    // Renderer sends signal → forward to mobile client
    ipcMain.on('remote-view:signal-out', (_event, clientId: string, signal: unknown) => {
      this.send(clientId, 'remote-view:signal', { signal });
    });
  }
  
  // ... existing handleUpgrade, handleClose, pingAll, send, broadcast methods stay the same ...
  
  private async handleMessage(clientId: string, raw: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const msg = JSON.parse(raw) as WSEnvelope<any>;
      
      switch (msg.type) {
        case 'ping':
          client.lastPing = Date.now();
          this.send(clientId, 'pong', null);
          break;
          
        case 'subscribe':
          this.handleSubscribe(client, msg.payload);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(client, msg.payload);
          break;
          
        case 'term:input':
          this.handleTerminalInput(msg.payload);
          break;
          
        case 'term:resize':
          this.handleTerminalResize(msg.payload);
          break;
        
        // =====================================================================
        // Remote View handlers
        // =====================================================================
        
        case 'remote-view:list':
          this.handleRemoteViewList(clientId);
          break;
          
        case 'remote-view:start':
          this.handleRemoteViewStart(clientId, msg.payload);
          break;
          
        case 'remote-view:signal':
          this.handleRemoteViewSignal(clientId, msg.payload);
          break;
          
        case 'remote-view:input':
          this.handleRemoteViewInput(msg.payload);
          break;
          
        case 'remote-view:stop':
          this.handleRemoteViewStop(clientId);
          break;
      }
    } catch (e) {
      this.send(clientId, 'error', { code: 'parse_error', message: 'Invalid message' });
    }
  }
  
  // ===========================================================================
  // Remote View Handlers
  // ===========================================================================
  
  private handleRemoteViewList(clientId: string) {
    if (!this.getBrowserViewsMap) {
      this.send(clientId, 'remote-view:list', { browsers: [] });
      return;
    }
    
    const viewsMap = this.getBrowserViewsMap();
    const browsers: Array<{
      id: string;
      label: string;
      url: string;
      title: string;
      bounds: { width: number; height: number };
    }> = [];

    for (const [label, { view }] of viewsMap) {
      try {
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        const bounds = view.getBounds();

        browsers.push({
          id: label,
          label,
          url,
          title,
          bounds: { width: bounds.width, height: bounds.height }
        });
      } catch {
        // View might be destroyed, skip
      }
    }
    
    this.send(clientId, 'remote-view:list', { browsers });
  }
  
  private handleRemoteViewStart(clientId: string, payload: { browserId: string; quality: string }) {
    const mainWindow = this.getMainWindow?.();
    if (!mainWindow || !this.getBrowserViewsMap) {
      this.send(clientId, 'remote-view:error', { error: 'Desktop not available', code: 'NOT_FOUND' });
      return;
    }
    
    const { browserId, quality } = payload;
    
    // Get browser bounds directly
    const viewsMap = this.getBrowserViewsMap();
    const viewInfo = viewsMap.get(browserId);
    
    if (!viewInfo) {
      this.send(clientId, 'remote-view:error', { error: 'Browser not found', code: 'NOT_FOUND' });
      return;
    }
    
    const bounds = viewInfo.view.getBounds();
    
    // Notify renderer to start capture and create peer for this client
    mainWindow.webContents.send('remote-view:viewer-connected', clientId, browserId, quality);
    
    // Confirm to mobile
    this.send(clientId, 'remote-view:started', { 
      browserId, 
      bounds: { width: bounds.width, height: bounds.height } 
    });
  }
  
  private handleRemoteViewSignal(clientId: string, payload: { signal: unknown }) {
    const mainWindow = this.getMainWindow?.();
    if (!mainWindow) return;
    
    // Forward WebRTC signal to renderer
    mainWindow.webContents.send('remote-view:signal-in', clientId, payload.signal);
  }
  
  private handleRemoteViewInput(payload: { browserId: string; input: RemoteInput; viewport: ViewportInfo }) {
    if (!this.getMainWindow) return;
    
    const { browserId, input, viewport } = payload;
    
    // Call the exported injection function directly - no IPC round-trip needed
    injectInputIntoBrowser(browserId, input, viewport, this.getMainWindow);
  }
  
  private handleRemoteViewStop(clientId: string) {
    const mainWindow = this.getMainWindow?.();
    if (!mainWindow) return;
    
    mainWindow.webContents.send('remote-view:viewer-disconnected', clientId);
  }
}

export const wsManager = new WSManager();
```

---

## Renderer: Initialize Manager on App Load

### MODIFY: src/App.tsx (or appropriate initialization point)

```typescript
import { useEffect } from 'react';
import { getRemoteViewManager } from './renderer/remote-view';

function App() {
  useEffect(() => {
    // Initialize remote view manager
    const manager = getRemoteViewManager();
    
    // Set up signal forwarding to main process
    manager.onSignal((clientId, signal) => {
      window.remoteView.sendSignal(clientId, signal);
    });
    
    // Listen for viewer connections from main
    // handleViewerConnect is now async and handles capture internally
    const unsubConnect = window.remoteView.onViewerConnected(async (clientId, browserId, quality) => {
      await manager.handleViewerConnect(clientId, browserId, quality as 'low' | 'medium' | 'high');
    });
    
    // Listen for incoming signals from mobile
    const unsubSignal = window.remoteView.onSignal((clientId, signal) => {
      manager.handleSignal(clientId, signal as any);
    });
    
    // Listen for viewer disconnections
    const unsubDisconnect = window.remoteView.onViewerDisconnected((clientId) => {
      manager.disconnectViewer(clientId);
      
      // Stop capture if no more viewers
      if (manager.getSessionCount() === 0) {
        manager.stopCapture();
      }
    });
    
    return () => {
      unsubConnect();
      unsubSignal();
      unsubDisconnect();
      manager.destroy();
    };
  }, []);

  // ... rest of App
}
```

---

## Mobile: Remote Viewer Component

### FILE: src/mobile/components/remote-view/RemoteViewer.tsx

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { TouchOverlay } from './TouchOverlay';
import { ViewerControls } from './ViewerControls';
import { useWebSocket } from '../../hooks/useWebSocket';

interface RemoteViewerProps {
  browserId: string;
  bounds: { width: number; height: number };
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (quality: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
}

export function RemoteViewer({
  browserId,
  bounds,
  quality,
  onQualityChange,
  onDisconnect
}: RemoteViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer.Instance | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { send, on } = useWebSocket();

  // Create WebRTC peer connection
  useEffect(() => {
    const peer = new Peer({
      initiator: false, // Mobile is NOT the initiator (desktop has the stream)
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      // Send our signal to desktop via WebSocket
      send('remote-view:signal', { 
        signal: { type: getSignalType(data), data } 
      });
    });

    peer.on('stream', (stream) => {
      console.log('[RemoteViewer] Received stream');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setConnected(true);
      setConnecting(false);
    });

    peer.on('connect', () => {
      console.log('[RemoteViewer] Data channel connected');
    });

    peer.on('close', () => {
      console.log('[RemoteViewer] Peer closed');
      setConnected(false);
    });

    peer.on('error', (err) => {
      console.error('[RemoteViewer] Peer error:', err);
      setError(err.message);
      setConnecting(false);
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
      peerRef.current = null;
    };
  }, [send]);

  // Listen for incoming signals from desktop
  useEffect(() => {
    const unsubSignal = on('remote-view:signal', (msg) => {
      const { signal } = msg.payload as { signal: { data: unknown } };
      if (peerRef.current && signal?.data) {
        peerRef.current.signal(signal.data);
      }
    });
    
    const unsubError = on('remote-view:error', (msg) => {
      const { error } = msg.payload as { error: string };
      setError(error);
      setConnecting(false);
    });

    return () => {
      unsubSignal();
      unsubError();
    };
  }, [on]);

  // Send input to desktop via data channel
  const sendInput = useCallback((input: any) => {
    if (!peerRef.current || !connected || !videoRef.current) return;

    const videoRect = videoRef.current.getBoundingClientRect();
    
    const message = {
      type: 'input',
      input,
      viewport: {
        remoteWidth: videoRect.width,
        remoteHeight: videoRect.height,
        viewBounds: bounds
      },
      browserId
    };

    // Try data channel first (lower latency)
    try {
      peerRef.current.send(JSON.stringify(message));
    } catch {
      // Fallback to WebSocket
      send('remote-view:input', message);
    }
  }, [connected, bounds, browserId, send]);

  const handleDisconnect = useCallback(() => {
    send('remote-view:stop', {});
    onDisconnect();
  }, [send, onDisconnect]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-red-500 mb-4">Connection Error</p>
        <p className="text-content-tertiary mb-4 text-center">{error}</p>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 bg-surface-secondary rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-content-tertiary border-t-content-primary rounded-full animate-spin" />
            <span className="text-content-tertiary">Connecting...</span>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {connected && (
        <TouchOverlay
          videoRef={videoRef}
          onInput={sendInput}
        />
      )}

      <ViewerControls
        quality={quality}
        onQualityChange={onQualityChange}
        onDisconnect={handleDisconnect}
        connected={connected}
      />
    </div>
  );
}

function getSignalType(data: any): 'offer' | 'answer' | 'candidate' {
  if (data.type === 'offer') return 'offer';
  if (data.type === 'answer') return 'answer';
  return 'candidate';
}
```

---

### FILE: src/mobile/components/remote-view/TouchOverlay.tsx

```tsx
import React, { useRef, useCallback } from 'react';

interface TouchOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onInput: (input: any) => void;
}

export function TouchOverlay({ videoRef, onInput }: TouchOverlayProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPosition = useCallback((touch: React.Touch) => {
    const video = videoRef.current;
    if (!video) return { x: 0, y: 0 };
    const rect = video.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }, [videoRef]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (e.touches.length === 1) {
      const pos = getPosition(e.touches[0]);
      touchStartRef.current = { ...pos, time: Date.now() };

      // Long press = right click
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          onInput({ type: 'rightclick', ...pos });
          touchStartRef.current = null;
        }
      }, 500);
    } else if (e.touches.length === 2) {
      // Two finger tap = right click
      clearTimeout(longPressTimerRef.current!);
      onInput({ type: 'rightclick', ...getPosition(e.touches[0]) });
      touchStartRef.current = null;
    }
  }, [getPosition, onInput]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Two finger drag = scroll
    if (e.touches.length === 2 && touchStartRef.current) {
      const pos = getPosition(e.touches[0]);
      const deltaY = (touchStartRef.current.y - pos.y) * 3;
      onInput({ type: 'scroll', x: pos.x, y: pos.y, deltaY });
      touchStartRef.current = { ...pos, time: Date.now() };
    }
  }, [getPosition, onInput]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartRef.current) {
      const duration = Date.now() - touchStartRef.current.time;
      if (duration < 200) {
        onInput({ type: 'click', x: touchStartRef.current.x, y: touchStartRef.current.y });
      }
      touchStartRef.current = null;
    }
  }, [onInput]);

  return (
    <div
      className="absolute inset-0 z-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    />
  );
}
```

---

### FILE: src/mobile/components/remote-view/ViewerControls.tsx

```tsx
import React from 'react';

interface ViewerControlsProps {
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (q: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  connected: boolean;
}

export function ViewerControls({ quality, onQualityChange, onDisconnect, connected }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                quality === q
                  ? 'bg-white text-black'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {q.charAt(0).toUpperCase() + q.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-white/60 text-xs">
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>

        <button
          onClick={onDisconnect}
          className="px-4 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium rounded-full transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}
```

---

### FILE: src/mobile/screens/RemoteView.tsx

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Monitor, RefreshCw } from 'lucide-react';
import { RemoteViewer } from '../components/remote-view/RemoteViewer';
import { useWebSocket } from '../hooks/useWebSocket';

interface Browser {
  id: string;
  label: string;
  url: string;
  title: string;
  bounds: { width: number; height: number };
}

export function RemoteView() {
  const navigate = useNavigate();
  const { isConnected, send, on } = useWebSocket();
  
  const [browsers, setBrowsers] = useState<Browser[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<Browser | null>(null);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(true);

  // Listen for browser list response
  useEffect(() => {
    const unsub = on('remote-view:list', (msg) => {
      const { browsers } = msg.payload as { browsers: Browser[] };
      setBrowsers(browsers || []);
      setLoading(false);
    });
    
    return unsub;
  }, [on]);

  // Listen for view started confirmation
  useEffect(() => {
    const unsub = on('remote-view:started', (msg) => {
      const { bounds } = msg.payload as { bounds: { width: number; height: number } };
      // Update bounds if needed
      if (selectedBrowser) {
        setSelectedBrowser({ ...selectedBrowser, bounds });
      }
    });
    
    return unsub;
  }, [on, selectedBrowser]);

  // Fetch browsers
  const fetchBrowsers = useCallback(() => {
    if (isConnected) {
      setLoading(true);
      send('remote-view:list', {});
    }
  }, [isConnected, send]);

  // Fetch on mount and when connected
  useEffect(() => {
    fetchBrowsers();
  }, [fetchBrowsers]);

  // Start viewing a browser
  const handleSelect = (browser: Browser) => {
    setSelectedBrowser(browser);
    send('remote-view:start', {
      browserId: browser.id,
      quality
    });
  };

  // If viewing, show the viewer
  if (selectedBrowser) {
    return (
      <div className="h-full bg-black">
        <RemoteViewer
          browserId={selectedBrowser.id}
          bounds={selectedBrowser.bounds}
          quality={quality}
          onQualityChange={setQuality}
          onDisconnect={() => setSelectedBrowser(null)}
        />
      </div>
    );
  }

  // Browser selection UI
  return (
    <div className="min-h-full bg-surface-primary text-content-primary">
      <header className="sticky top-0 bg-surface-primary/90 backdrop-blur border-b border-border-primary z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold">Remote View</h1>
          <div className="flex-1" />
          <button onClick={fetchBrowsers} disabled={loading} className="p-2">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="p-4">
        {!isConnected ? (
          <div className="text-center py-12 text-content-tertiary">
            Connecting to Maestro...
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-content-tertiary">
            Loading browsers...
          </div>
        ) : browsers.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 mx-auto mb-4 text-content-tertiary" />
            <p className="text-content-secondary">No browser tabs open</p>
            <p className="text-content-tertiary text-sm mt-2">
              Open a browser in Maestro to view it here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {browsers.map((browser) => (
              <button
                key={browser.id}
                onClick={() => handleSelect(browser)}
                className="w-full p-4 bg-surface-secondary hover:bg-surface-tertiary active:bg-surface-tertiary rounded-xl text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-tertiary rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-content-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {browser.title || 'Untitled'}
                    </div>
                    <div className="text-sm text-content-tertiary truncate">
                      {browser.url}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

---

## Mobile Router Integration

### MODIFY: src/mobile/App.tsx

Add the RemoteView import and route:

```tsx
// Add to imports
import { RemoteView } from './screens/RemoteView';

// In ProtectedRoutes, add to Routes:
<Route path="/remote-view" element={<RemoteView />} />
```

Full updated ProtectedRoutes:

```tsx
function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col bg-surface-primary" style={{ height: '100dvh' }}>
      <main className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          {/* Tab routes */}
          <Route path="/" element={<AgentList />} />
          <Route path="/spaces" element={<SpaceList />} />
          <Route path="/more" element={<More />} />

          {/* Detail routes */}
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/space/:id" element={<SpaceDetail />} />
          <Route path="/terminal/:id" element={<Terminal />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Remote View */}
          <Route path="/remote-view" element={<RemoteView />} />
        </Routes>
      </main>
      <BottomTabBar />
    </div>
  );
}
```

You'll also want to add a navigation link to RemoteView, likely in the "More" screen or as a new tab.

---

## TypeScript Declarations

### FILE: src/types/remote-view.d.ts

```typescript
interface RemoteViewAPI {
  getSources(): Promise<Array<{ id: string; name: string; thumbnail?: string }>>;
  getMaestroSource(): Promise<{ id: string; name: string; thumbnail?: string } | null>;
  getBrowsers(): Promise<Array<{
    id: string;
    label: string;
    url: string;
    title: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>>;
  getBrowserBounds(browserId: string): Promise<{ width: number; height: number } | null>;
  injectInput(browserId: string, input: unknown, viewport: unknown): Promise<boolean>;
  sendSignal(clientId: string, signal: unknown): void;
  onSignal(callback: (clientId: string, signal: unknown) => void): () => void;
  onViewerConnected(callback: (clientId: string, browserId: string, quality: string) => void): () => void;
  onViewerDisconnected(callback: (clientId: string) => void): () => void;
}

declare global {
  interface Window {
    remoteView: RemoteViewAPI;
  }
}

export {};
```

---

## Implementation Checklist

### Phase 1: Dependencies & Types
- [ ] Run `pnpm add simple-peer && pnpm add -D @types/simple-peer`
- [ ] Create `src/renderer/remote-view/types.ts`
- [ ] Create `src/types/remote-view.d.ts`

### Phase 2: Main Process
- [ ] Create `src/ipc/remote-view.ts`
- [ ] Modify `src/main.ts`:
  - Import `registerRemoteViewHandlers`, `cleanupRemoteViewHandlers`
  - Import `wsManager` and `getBrowserViewsMap`
  - Call `registerRemoteViewHandlers(getMainWindow)` in ready handler
  - Call `wsManager.setRemoteViewDependencies(getMainWindow, getBrowserViewsMap)`
  - Add cleanup in `window-all-closed`

### Phase 3: Preload
- [ ] Add `remoteView` API to `src/preload.ts`

### Phase 4: WebSocket Handler
- [ ] Modify `src/services/remote-server/websocket/handler.ts`:
  - Add `setRemoteViewDependencies` method
  - Add `setupIPCListeners` method
  - Add remote-view message handlers to switch statement

### Phase 5: Renderer (WebRTC)
- [ ] Create `src/renderer/remote-view/index.ts` (RemoteViewManager)
- [ ] Modify `src/App.tsx`:
  - Import and initialize `getRemoteViewManager()`
  - Set up signal forwarding
  - Listen for viewer connect/disconnect events

### Phase 6: Mobile UI
- [ ] Create `src/mobile/components/remote-view/TouchOverlay.tsx`
- [ ] Create `src/mobile/components/remote-view/ViewerControls.tsx`
- [ ] Create `src/mobile/components/remote-view/RemoteViewer.tsx`
- [ ] Create `src/mobile/screens/RemoteView.tsx`
- [ ] Modify `src/mobile/App.tsx`:
  - Import `RemoteView`
  - Add route: `<Route path="/remote-view" element={<RemoteView />} />`
- [ ] Add navigation link to RemoteView (in More screen or BottomTabBar)

### Phase 7: Testing
- [ ] Start desktop: `pnpm dev`
- [ ] Start mobile: `pnpm dev:mobile`
- [ ] Open a browser tab in Maestro
- [ ] Navigate to Remote View on mobile
- [ ] Verify browser list loads
- [ ] Select a browser, verify video stream connects
- [ ] Test tap → click
- [ ] Test two-finger scroll
- [ ] Test long press → right click
- [ ] Test over Tailscale network

---

## Key Architecture Points (Don't Forget!)

1. **WebRTC is RENDERER ONLY** - Never try to create Peer or MediaStream in main process
2. **IPC passes serializable data** - Source IDs, signal objects, input events - never MediaStream
3. **Desktop is initiator** - Desktop has the stream, creates offer, mobile answers
4. **Data channel for input** - Lower latency than WebSocket, falls back if needed
5. **Main process does injection** - `webContents.sendInputEvent()` requires main process access

---

## Troubleshooting

### "RTCPeerConnection is not defined"
You're trying to use WebRTC in main process. Move to renderer.

### MediaStream is empty/undefined after IPC
MediaStream cannot cross IPC boundary. Keep capture and streaming in same renderer context.

### Video shows but no input works
- Check main window is focused before injection
- Verify coordinate mapping matches actual BrowserView bounds
- Check browserId is correct

### High latency on input
- Use data channel (peer.send) instead of WebSocket
- Reduce quality preset
- Check network (Tailscale direct vs relayed)

### Stream quality is poor
- Verify quality preset is applied to getUserMedia constraints
- Check if hardware encoding is being used
- Try `app.commandLine.appendSwitch('enable-features', 'VaapiVideoEncoder')`

---

## Platform-Specific Known Issues

### Windows
- **Elevated context bug (Electron 30+)**: `getUserMedia` fails for window capture when running as Administrator. Workaround: Use screen capture instead, or run without elevation.
- **Multi-monitor display ID mismatch**: Fixed in Electron 31, but verify source thumbnails match expected display if issues occur.

### macOS
- **Screen Recording permission required**: User must grant permission in System Preferences → Security & Privacy → Privacy → Screen Recording. App may need restart after granting.
- **`useSystemPicker` option**: Experimental in Electron 32+ for macOS 15+, not required for this implementation.

### Linux
- **Pipewire quirk**: May return only a single source regardless of connected displays. User selection happens at system level.

### Performance
- Add launch flag for better CPU utilization: `app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100')`
