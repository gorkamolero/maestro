import { useEffect, useCallback, useSyncExternalStore } from 'react';
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

// Module-level singleton state - shared across all hook instances
let ws: WebSocket | null = null;
let isConnectedState = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
const handlers = new Map<string, Set<MessageHandler>>();
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

function getSnapshot() {
  return isConnectedState;
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function connectWebSocket(token: string, refreshToken: () => Promise<void>) {
  if (!token || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    console.log('[WS] Connect skipped - already connected/connecting or no token');
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost'
    ? 'localhost:7777'
    : window.location.host;
  const url = `${protocol}//${host}/ws?token=${token}`;

  console.log('[WS] Connecting to:', url);
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[WS] Connected');
    isConnectedState = true;
    notifySubscribers();

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg: WSMessage = JSON.parse(event.data);
      console.log('[WS] Received:', msg.type);
      const typeHandlers = handlers.get(msg.type);
      typeHandlers?.forEach(handler => handler(msg));
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  };

  ws.onclose = (event) => {
    console.log('[WS] Disconnected:', event.code);
    isConnectedState = false;
    ws = null;
    notifySubscribers();

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }

    // Reconnect unless intentional close
    if (event.code !== 1000) {
      reconnectTimeout = setTimeout(() => {
        if (event.code === 4401) {
          refreshToken().then(() => connectWebSocket(token, refreshToken));
        } else {
          connectWebSocket(token, refreshToken);
        }
      }, 3000);
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };

  // Keepalive
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
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
}

function disconnectWebSocket() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close(1000);
    ws = null;
  }
  isConnectedState = false;
  notifySubscribers();
}

function sendMessage(type: string, payload: unknown) {
  console.log('[WS] send() called:', type, 'ws:', !!ws, 'readyState:', ws?.readyState, '(OPEN=1)');
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('[WS] send() ABORTED - WebSocket not open');
    return false;
  }

  ws.send(JSON.stringify({
    v: 1,
    id: uuidv4(),
    ts: new Date().toISOString(),
    type,
    payload,
    timestamp: Date.now(),
  }));
  console.log('[WS] send() SUCCESS:', type);
  return true;
}

function addHandler(type: string, handler: MessageHandler) {
  if (!handlers.has(type)) {
    handlers.set(type, new Set());
  }
  handlers.get(type)!.add(handler);

  return () => {
    handlers.get(type)?.delete(handler);
  };
}

// Hook that uses the singleton
export function useWebSocket() {
  const { token, refreshToken } = useAuth();

  // Use useSyncExternalStore to subscribe to connection state changes
  const isConnected = useSyncExternalStore(subscribe, getSnapshot);

  // Connect when token is available
  useEffect(() => {
    if (token) {
      connectWebSocket(token, refreshToken);
    }
    // Don't disconnect on unmount - keep singleton alive
  }, [token, refreshToken]);

  const send = useCallback((type: string, payload: unknown) => {
    return sendMessage(type, payload);
  }, []);

  const subscribeChannel = useCallback((channel: string, id?: string) => {
    send('subscribe', { channel, id });
  }, [send]);

  const unsubscribe = useCallback((channel: string, id?: string) => {
    send('unsubscribe', { channel, id });
  }, [send]);

  const on = useCallback((type: string, handler: MessageHandler) => {
    return addHandler(type, handler);
  }, []);

  return { isConnected, send, subscribe: subscribeChannel, unsubscribe, on };
}
