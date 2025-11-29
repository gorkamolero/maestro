import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { Wifi, WifiOff } from 'lucide-react';
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

    try {
      peerRef.current.send(JSON.stringify(message));
    } catch {
      send('remote-view:input', message);
    }
  }, [connected, bounds, browserId, send]);

  const handleDisconnect = useCallback(() => {
    send('remote-view:stop', {});
    onDisconnect();
  }, [send, onDisconnect]);

  // Error state
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full p-6"
        style={{ background: '#0f0e0d' }}
      >
        {/* Error card */}
        <div
          className="w-full max-w-[280px] p-6 rounded-2xl backdrop-blur-xl animate-scale-in"
          style={{
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, rgba(25, 25, 28, 0.95) 40%)',
            boxShadow: `
              inset 0 1px 0 0 rgba(255,255,255,0.04),
              inset 0 0 0 1px rgba(239, 68, 68, 0.15),
              0 12px 48px -12px rgba(0,0,0,0.6),
              0 0 40px -15px rgba(239, 68, 68, 0.3)
            `,
          }}
        >
          {/* Icon */}
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.08) 100%)',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.2)',
            }}
          >
            <WifiOff className="w-7 h-7 text-red-400" />
          </div>

          <h3 className="text-[16px] font-semibold text-center text-[--text-primary] mb-1">
            Connection Failed
          </h3>
          <p className="text-[12px] text-center text-[--text-tertiary] mb-5 leading-relaxed">
            {error}
          </p>

          <button
            onClick={handleDisconnect}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all active:scale-[0.97]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fafaf9',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0f0e0d' }}
    >
      {/* Ambient glow effect behind video */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: connected
            ? 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(16, 185, 129, 0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          transition: 'background 500ms ease-out',
        }}
      />

      {/* Connecting state */}
      {connecting && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: 'rgba(15, 14, 13, 0.98)' }}
        >
          <div className="flex flex-col items-center gap-5 animate-fade-in">
            {/* Animated connection indicator */}
            <div className="relative w-20 h-20">
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  border: '2px solid rgba(245, 158, 11, 0.15)',
                }}
              />
              {/* Middle ring - rotating */}
              <div
                className="absolute inset-2 rounded-full animate-spin"
                style={{
                  border: '2px solid transparent',
                  borderTopColor: 'rgba(245, 158, 11, 0.4)',
                  animationDuration: '1.5s',
                }}
              />
              {/* Inner glow */}
              <div
                className="absolute inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
                }}
              />
              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Wifi
                  className="w-7 h-7 animate-pulse"
                  style={{ color: '#f59e0b' }}
                />
              </div>
            </div>

            <div className="text-center">
              <p className="text-[15px] font-medium text-[--text-primary] mb-1">
                Establishing Connection
              </p>
              <p className="text-[12px] text-[--text-tertiary]">
                Syncing with desktop...
              </p>
            </div>

            {/* Connection progress dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: '#f59e0b',
                    animationDelay: `${i * 200}ms`,
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.5)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video container with frame */}
      <div
        className="absolute inset-3 rounded-2xl overflow-hidden"
        style={{
          boxShadow: `
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 0 60px -20px ${connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0,0,0,0.5)'}
          `,
          transition: 'box-shadow 500ms ease-out',
        }}
      >
        {/* Video frame accent */}
        <div
          className="absolute inset-0 pointer-events-none z-10 rounded-2xl"
          style={{
            boxShadow: 'inset 0 0 100px 20px rgba(0,0,0,0.3)',
          }}
        />

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{ background: '#0a0a09' }}
        />
      </div>

      {/* Live indicator badge - top right */}
      {connected && (
        <div className="absolute top-5 right-5 z-20 animate-fade-in">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 20px rgba(16, 185, 129, 0.15)',
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"
                style={{ boxShadow: '0 0 6px #10b981' }}
              />
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.1em]">
              Live
            </span>
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
