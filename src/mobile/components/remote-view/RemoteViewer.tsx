import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { Monitor, AlertCircle } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center h-full p-6 bg-black">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-content-primary font-medium mb-1">Connection Failed</p>
        <p className="text-content-tertiary text-[12px] text-center mb-6 max-w-[240px]">{error}</p>
        <button
          onClick={handleDisconnect}
          className="px-5 py-2 bg-surface-card border border-white/[0.06] rounded-xl text-content-primary text-sm font-medium
            active:bg-surface-hover transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Animated rings loading state */}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 z-10">
          <div className="flex flex-col items-center gap-4">
            {/* Concentric pulsing rings */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
              <div
                className="absolute inset-2 rounded-full border-2 border-amber-500/30 animate-ping"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="absolute inset-4 rounded-full border-2 border-amber-500/40 animate-ping"
                style={{ animationDelay: '300ms' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-content-primary font-medium text-sm">Connecting</p>
              <p className="text-content-tertiary text-[11px] mt-1">Establishing secure stream...</p>
            </div>
          </div>
        </div>
      )}

      {/* Video with subtle frame */}
      <div className="absolute inset-2 rounded-xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-neutral-900"
        />
      </div>

      {/* Live badge when connected */}
      {connected && (
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
          </div>
        </div>
      )}

      {/* Touch overlay for input */}
      {connected && (
        <TouchOverlay
          videoRef={videoRef}
          onInput={sendInput}
        />
      )}

      {/* Controls */}
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
