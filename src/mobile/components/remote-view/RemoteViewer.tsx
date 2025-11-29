import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { Monitor, WifiOff, ArrowLeft } from 'lucide-react';
import { TouchOverlay } from './TouchOverlay';
import { ViewerControls } from './ViewerControls';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { RemoteInput } from '../../../renderer/remote-view/types';

interface RemoteViewerProps {
  browserId: string;
  bounds: { width: number; height: number };
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (quality: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  isShadowBrowser?: boolean;
}

export function RemoteViewer({
  browserId,
  bounds,
  quality,
  onQualityChange,
  onDisconnect,
  isShadowBrowser = false
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
      initiator: false,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      send('remote-view:signal', {
        signal: { type: getSignalType(data), data }
      });
    });

    peer.on('stream', (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setConnected(true);
      setConnecting(false);
    });

    peer.on('close', () => {
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
      const { signal } = msg.payload as { signal: { data: Peer.SignalData } };
      if (peerRef.current && signal?.data) {
        peerRef.current.signal(signal.data);
      }
    });

    const unsubError = on('remote-view:error', (msg) => {
      const { error: errMsg } = msg.payload as { error: string };
      setError(errMsg);
      setConnecting(false);
    });

    return () => {
      unsubSignal();
      unsubError();
    };
  }, [on]);

  // Send input to desktop
  const sendInput = useCallback((input: RemoteInput) => {
    if (!peerRef.current || !connected || !videoRef.current) return;

    const videoRect = videoRef.current.getBoundingClientRect();
    const viewport = {
      remoteWidth: videoRect.width,
      remoteHeight: videoRect.height,
      viewBounds: bounds
    };

    if (isShadowBrowser) {
      send('shadow-browser:input', { input, viewport });
      return;
    }

    const message = { type: 'input', input, viewport, browserId };
    try {
      peerRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.warn('[RemoteViewer] Data channel send failed, falling back to WS:', err);
      send('remote-view:input', message);
    }
  }, [connected, bounds, browserId, send, isShadowBrowser]);

  const handleDisconnect = useCallback(() => {
    send(isShadowBrowser ? 'shadow-browser:close' : 'remote-view:stop', {});
    onDisconnect();
  }, [send, onDisconnect, isShadowBrowser]);

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-surface-primary">
        <div className="w-16 h-16 rounded-xl bg-surface-card border border-white/[0.08] flex items-center justify-center mb-4">
          <WifiOff className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-[15px] font-medium text-content-primary mb-1">
          Connection Failed
        </h3>
        <p className="text-[12px] text-content-tertiary text-center mb-5 max-w-[240px]">
          {error}
        </p>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-surface-hover border border-white/[0.08] text-content-primary active:scale-[0.98] transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-surface-primary">
      {/* Connecting state */}
      {connecting && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-surface-primary">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-surface-card border border-white/[0.08] flex items-center justify-center">
              <Monitor className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-content-primary mb-1">
                Connecting
              </p>
              <p className="text-[12px] text-content-tertiary">
                Establishing video stream...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video container */}
      <div className="absolute inset-0 pb-11" style={{ paddingBottom: 'calc(2.75rem + env(safe-area-inset-bottom))' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain bg-black"
        />
      </div>

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

function getSignalType(data: Peer.SignalData): 'offer' | 'answer' | 'candidate' {
  if ('type' in data && data.type === 'offer') return 'offer';
  if ('type' in data && data.type === 'answer') return 'answer';
  return 'candidate';
}
