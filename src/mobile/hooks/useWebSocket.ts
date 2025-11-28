import { useEffect, useRef, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../lib/auth';

interface WSMessage {
  v: 1;
  id: string;
  ts: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

type MessageHandler = (msg: WSMessage) => void;

export function useWebSocket() {
  const { token, refreshToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:7777';
    const url = `${protocol}//${host}/ws?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setIsConnected(true);
      
      // Clear reconnect timer
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        const handlers = handlersRef.current.get(msg.type);
        handlers?.forEach(handler => handler(msg));
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code);
      setIsConnected(false);
      wsRef.current = null;

      // Reconnect unless intentional close
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (event.code === 4401) {
            // Token expired - refresh first
            refreshToken().then(() => connectRef.current());
          } else {
            connectRef.current();
          }
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    // Keepalive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          v: 1,
          id: uuidv4(),
          ts: new Date().toISOString(),
          type: 'ping',
          payload: null,
          timestamp: Date.now(),
        }));
      }
    }, 25_000);

    return () => {
      clearInterval(pingInterval);
      ws.close(1000);
    };
  }, [token, refreshToken]);

  // Update ref whenever connect changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      v: 1,
      id: uuidv4(),
      ts: new Date().toISOString(),
      type,
      payload,
      timestamp: Date.now(),
    }));
  }, []);

  const subscribe = useCallback((channel: string, id?: string) => {
    send('subscribe', { channel, id });
  }, [send]);

  const unsubscribe = useCallback((channel: string, id?: string) => {
    send('unsubscribe', { channel, id });
  }, [send]);

  const on = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    const handlers = handlersRef.current.get(type);
    if (handlers) {
      handlers.add(handler);
    }

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return { isConnected, send, subscribe, unsubscribe, on };
}
