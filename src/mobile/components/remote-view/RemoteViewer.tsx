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
