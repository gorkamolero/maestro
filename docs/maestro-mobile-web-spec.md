# Maestro Mobile Web UI

Mobile control for your AI coding agents. Served directly from Electron, accessible anywhere via Tailscale.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your Mac (Anywhere)                          │
├─────────────────────────────────────────────────────────────────┤
│  Maestro Electron App                                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Remote Server (:7777)                                      │ │
│  │  ├── /api/*     → REST API                                  │ │
│  │  ├── /ws        → WebSocket                                 │ │
│  │  └── /*         → Mobile Web UI (static)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ Tailscale VPN
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Phone (Home)   │     │ Phone (Anywhere)│
│  100.x.x.x:7777 │     │ 100.x.x.x:7777  │
└─────────────────┘     └─────────────────┘
         ▲
         │ Push Notification
         │
┌─────────────────┐
│  ntfy.sh        │ ◄── Maestro POST on needs_input
└─────────────────┘
```

## File Structure

```
src/
├── main/
│   └── services/
│       └── remote-server/
│           ├── index.ts              # Add static file serving
│           └── notifications.ts      # Ntfy integration
├── renderer/                         # Desktop UI (existing)
├── mobile/                           # Mobile Web UI (new)
│   ├── index.html                    # Entry point
│   ├── main.tsx                      # React root
│   ├── App.tsx                       # Router
│   ├── vite.config.ts                # Build config
│   ├── screens/
│   │   ├── AgentList.tsx             # Home screen
│   │   ├── AgentDetail.tsx           # Agent + activity feed
│   │   ├── Terminal.tsx              # Full terminal view
│   │   └── Settings.tsx              # Server URL, notifications
│   ├── components/
│   │   ├── AgentCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── QuickActions.tsx
│   │   ├── TerminalView.tsx
│   │   └── StatusBadge.tsx
│   ├── hooks/
│   │   ├── useAgents.ts
│   │   ├── useWebSocket.ts
│   │   └── useTerminal.ts
│   └── lib/
│       ├── api.ts                    # API client
│       └── auth.ts                   # Token management
└── shared/                           # Shared between desktop & mobile
    ├── types/
    │   └── index.ts                  # Agent, Space, Terminal types
    ├── components/
    │   └── StatusBadge.tsx           # Reusable status indicator
    └── utils/
        └── format.ts                 # Time formatting, etc.
```

---

## 1. Build Configuration

### Mobile Vite Config

```typescript
// src/mobile/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: '/',
  build: {
    outDir: path.resolve(__dirname, '../../dist/mobile'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@mobile': path.resolve(__dirname),
    },
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "... existing ...",
    "dev:mobile": "vite --config src/mobile/vite.config.ts",
    "build": "npm run build:desktop && npm run build:mobile",
    "build:mobile": "vite build --config src/mobile/vite.config.ts"
  }
}
```

---

## 2. Serve Mobile from Remote Server

Update the remote server to serve static files:

```typescript
// src/main/services/remote-server/index.ts

import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import { app as electronApp } from 'electron';

// In setupRoutes():
private setupRoutes(): void {
  // API routes (existing)
  this.app.route('/auth', authRouter);
  this.app.use('/api/*', authMiddleware);
  this.app.route('/api/agents', agentsRouter);
  // ... etc

  // Serve mobile UI for all non-API routes
  const mobilePath = electronApp.isPackaged
    ? path.join(process.resourcesPath, 'mobile')
    : path.join(__dirname, '../../../../dist/mobile');

  // Static assets
  this.app.use('/assets/*', serveStatic({ root: mobilePath }));
  
  // SPA fallback - serve index.html for all other routes
  this.app.get('*', async (c) => {
    const indexPath = path.join(mobilePath, 'index.html');
    const html = await fs.readFile(indexPath, 'utf8');
    return c.html(html);
  });
}
```

---

## 3. Mobile Web Entry Point

```html
<!-- src/mobile/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>Maestro</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

```typescript
// src/mobile/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```typescript
// src/mobile/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AgentList } from './screens/AgentList';
import { AgentDetail } from './screens/AgentDetail';
import { Terminal } from './screens/Terminal';
import { Settings } from './screens/Settings';
import { Login } from './screens/Login';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<AgentList />} />
      <Route path="/agent/:id" element={<AgentDetail />} />
      <Route path="/terminal/:id" element={<Terminal />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="animate-pulse text-white/50">Loading...</div>
    </div>
  );
}
```

---

## 4. Authentication

```typescript
// src/mobile/lib/auth.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  token: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEYS = {
  DEVICE_ID: 'maestro_device_id',
  SECRET: 'maestro_secret',
  TOKEN: 'maestro_token',
  TOKEN_EXPIRES: 'maestro_token_expires',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check for existing credentials on mount
  useEffect(() => {
    const init = async () => {
      const storedDeviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      const storedSecret = localStorage.getItem(STORAGE_KEYS.SECRET);
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedExpires = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);

      if (storedDeviceId && storedSecret) {
        setDeviceId(storedDeviceId);
        
        // Check if token is still valid
        if (storedToken && storedExpires) {
          const expiresAt = new Date(storedExpires).getTime();
          if (Date.now() < expiresAt - 60_000) { // 1 min buffer
            setToken(storedToken);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        }
        
        // Try to refresh token
        try {
          await refreshTokenInternal(storedDeviceId, storedSecret);
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Token refresh failed:', err);
          // Credentials may be revoked
        }
      }
      
      setIsLoading(false);
    };
    
    init();
  }, []);

  // Refresh token using challenge-response
  const refreshTokenInternal = async (devId: string, secret: string) => {
    // Get challenge
    const { nonce } = await api.post<{ nonce: string }>('/auth/challenge', { deviceId: devId });
    
    // Sign: sha256(secret + "\n" + deviceId + "\n" + nonce)
    const message = `${secret}\n${devId}\n${nonce}`;
    const signature = await sha256(message);
    
    // Exchange for token
    const { token: newToken, expiresAt } = await api.post<{ token: string; expiresAt: string }>(
      '/auth/token',
      { deviceId: devId, nonce, signature }
    );
    
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt);
    setToken(newToken);
    
    return newToken;
  };

  // Login with PIN (pairing)
  const login = useCallback(async (pin: string) => {
    const devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID) || generateDeviceId();
    
    const { secret } = await api.post<{ deviceId: string; secret: string }>(
      '/auth/pair',
      {
        deviceId: devId,
        pin,
        name: getDeviceName(),
        platform: getPlatform(),
      }
    );
    
    // Store credentials
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    localStorage.setItem(STORAGE_KEYS.SECRET, secret);
    setDeviceId(devId);
    
    // Get initial token
    await refreshTokenInternal(devId, secret);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES);
    // Keep device ID and secret for re-auth
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const refreshToken = useCallback(async () => {
    const devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    const secret = localStorage.getItem(STORAGE_KEYS.SECRET);
    if (devId && secret) {
      await refreshTokenInternal(devId, secret);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      deviceId,
      token,
      login,
      logout,
      refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helpers
function generateDeviceId(): string {
  return 'mobile-' + crypto.randomUUID();
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  return 'Mobile Device';
}

function getPlatform(): 'ios' | 'android' {
  return /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : 'android';
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## 5. API Client

```typescript
// src/mobile/lib/api.ts

const getBaseUrl = () => {
  // In production, served from same origin
  if (window.location.hostname !== 'localhost') {
    return '';
  }
  // Dev: point to local server
  return 'http://localhost:7777';
};

class ApiClient {
  private baseUrl = getBaseUrl();

  private getToken(): string | null {
    return localStorage.getItem('maestro_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = this.getToken();
    
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Maestro ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      // Token expired - trigger refresh
      window.dispatchEvent(new CustomEvent('auth:token-expired'));
      throw new Error('Token expired');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return res.json();
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

export const api = new ApiClient();
```

---

## 6. WebSocket Hook

```typescript
// src/mobile/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
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
            refreshToken().then(connect);
          } else {
            connect();
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
          id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return { isConnected, send, subscribe, unsubscribe, on };
}
```

---

## 7. Screens

### Agent List (Home)

```typescript
// src/mobile/screens/AgentList.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { AgentCard } from '../components/AgentCard';
import { StatusBadge } from '@shared/components/StatusBadge';
import type { AgentInfo } from '@shared/types';

export function AgentList() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribe, on } = useWebSocket();

  // Initial fetch
  useEffect(() => {
    api.get<{ agents: AgentInfo[] }>('/api/agents')
      .then(({ agents }) => {
        setAgents(agents);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected) return;
    
    subscribe('agents');

    const offUpdated = on('agent:updated', (msg) => {
      const updated = msg.payload as AgentInfo;
      setAgents(prev => {
        const idx = prev.findIndex(a => a.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    });

    const offEnded = on('agent:ended', (msg) => {
      const { id } = msg.payload as { id: string };
      setAgents(prev => prev.filter(a => a.id !== id));
    });

    return () => {
      offUpdated();
      offEnded();
    };
  }, [isConnected, subscribe, on]);

  const needsInput = agents.filter(a => a.status === 'needs_input');
  const active = agents.filter(a => a.status === 'active');
  const idle = agents.filter(a => a.status === 'idle');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Agents</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <Link to="/settings" className="p-2 -m-2">
              <SettingsIcon className="w-5 h-5 text-white/60" />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {isLoading ? (
          <div className="text-center text-white/50 py-12">Loading...</div>
        ) : agents.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            No active agents
          </div>
        ) : (
          <>
            {/* Needs Input - Top Priority */}
            {needsInput.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-amber-500 uppercase tracking-wider mb-3">
                  Needs Input ({needsInput.length})
                </h2>
                <div className="space-y-2">
                  {needsInput.map(agent => (
                    <AgentCard key={agent.id} agent={agent} highlight />
                  ))}
                </div>
              </section>
            )}

            {/* Active */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                  Active ({active.length})
                </h2>
                <div className="space-y-2">
                  {active.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </section>
            )}

            {/* Idle */}
            {idle.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                  Idle ({idle.length})
                </h2>
                <div className="space-y-2">
                  {idle.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
```

### Agent Detail

```typescript
// src/mobile/screens/AgentDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { ActivityFeed } from '../components/ActivityFeed';
import { QuickActions } from '../components/QuickActions';
import { StatusBadge } from '@shared/components/StatusBadge';
import type { AgentInfo, AgentActivity } from '@shared/types';

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected, subscribe, on } = useWebSocket();

  // Fetch agent and activities
  useEffect(() => {
    if (!id) return;
    
    Promise.all([
      api.get<AgentInfo>(`/api/agents/${id}`),
      api.get<{ activities: AgentActivity[] }>(`/api/agents/${id}/activities?limit=50`),
    ])
      .then(([agentData, { activities: acts }]) => {
        setAgent(agentData);
        setActivities(acts);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [id]);

  // Subscribe to updates
  useEffect(() => {
    if (!isConnected || !id) return;

    subscribe('agent', id);

    const offActivity = on('agent:activity', (msg) => {
      const activity = msg.payload as AgentActivity;
      if (activity.sessionId === id) {
        setActivities(prev => [activity, ...prev].slice(0, 100));
      }
    });

    const offUpdated = on('agent:updated', (msg) => {
      const updated = msg.payload as AgentInfo;
      if (updated.id === id) {
        setAgent(updated);
      }
    });

    return () => {
      offActivity();
      offUpdated();
    };
  }, [isConnected, id, subscribe, on]);

  // Send input to agent terminal
  const sendInput = async (text: string) => {
    if (!id) return;
    await api.post(`/api/agents/${id}/input`, { text });
  };

  if (isLoading || !agent) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{agent.projectName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={agent.status} />
              <span className="text-xs text-white/40">{agent.type}</span>
            </div>
          </div>
          {agent.terminalId && (
            <Link
              to={`/terminal/${agent.terminalId}`}
              className="px-3 py-1.5 bg-white/10 rounded-lg text-sm"
            >
              Terminal
            </Link>
          )}
        </div>
      </header>

      {/* Quick Actions */}
      {agent.status === 'needs_input' && (
        <div className="border-b border-white/10">
          <QuickActions onSend={sendInput} />
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex-1 overflow-y-auto">
        <ActivityFeed activities={activities} />
      </div>

      {/* Input Bar */}
      <InputBar onSend={sendInput} />
    </div>
  );
}

function InputBar({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="sticky bottom-0 bg-black border-t border-white/10 p-3"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Send input..."
          className="flex-1 bg-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/40 outline-none focus:ring-1 focus:ring-white/20"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2 bg-white text-black rounded-lg font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
```

### Terminal

```typescript
// src/mobile/screens/Terminal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWebSocket } from '../hooks/useWebSocket';
import '@xterm/xterm/css/xterm.css';

export function Terminal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { isConnected, send, subscribe, on } = useWebSocket();
  const [inputSeq, setInputSeq] = useState(0);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new XTerm({
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#3f3f46',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle input
    terminal.onData((data) => {
      const seq = inputSeq + 1;
      setInputSeq(seq);
      send('term:input', { id, data, seq });
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      send('term:resize', {
        id,
        cols: terminal.cols,
        rows: terminal.rows,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [id]);

  // Subscribe to terminal output
  useEffect(() => {
    if (!isConnected || !id) return;

    // Attach to terminal (requests backlog)
    send('term:attach', { id });
    subscribe('terminal', id);

    const offFrame = on('term:frame', (msg) => {
      const { id: termId, data } = msg.payload as { id: string; data: string };
      if (termId === id && terminalRef.current) {
        terminalRef.current.write(data);
      }
    });

    const offExit = on('term:exit', (msg) => {
      const { id: termId, code } = msg.payload as { id: string; code: number };
      if (termId === id && terminalRef.current) {
        terminalRef.current.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`);
      }
    });

    return () => {
      offFrame();
      offExit();
      send('term:detach', { id });
    };
  }, [isConnected, id, send, subscribe, on]);

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-white">
          <ChevronLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-white font-medium">Terminal</h1>
        <div className="flex-1" />
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </header>

      {/* Terminal */}
      <div ref={containerRef} className="flex-1 p-2" />
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
```

### Login

```typescript
// src/mobile/screens/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(pin);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Maestro</h1>
        <p className="text-white/50 text-center mb-8">
          Enter the PIN shown on your Mac
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-white/10 rounded-xl px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] placeholder:text-white/20 outline-none focus:ring-2 focus:ring-white/20"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length !== 6 || isLoading}
            className="w-full bg-white text-black font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {isLoading ? 'Pairing...' : 'Pair Device'}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-8">
          Open Maestro on your Mac and click "Pair Device" to get a PIN
        </p>
      </div>
    </div>
  );
}
```

### Settings

```typescript
// src/mobile/screens/Settings.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export function Settings() {
  const navigate = useNavigate();
  const { logout, deviceId } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Device Info */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Device
          </h2>
          <p className="text-sm text-white/60 font-mono break-all">
            {deviceId}
          </p>
        </section>

        {/* Notifications */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            Notifications
          </h2>
          <p className="text-sm text-white/60">
            Push notifications are handled via ntfy. Configure your topic in Maestro desktop settings.
          </p>
        </section>

        {/* Actions */}
        <section>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-400 font-medium py-3 rounded-xl"
          >
            Disconnect Device
          </button>
        </section>
      </main>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
```

---

## 8. Components

### AgentCard

```typescript
// src/mobile/components/AgentCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@shared/components/StatusBadge';
import { formatRelativeTime } from '@shared/utils/format';
import type { AgentInfo } from '@shared/types';

interface AgentCardProps {
  agent: AgentInfo;
  highlight?: boolean;
}

export function AgentCard({ agent, highlight }: AgentCardProps) {
  return (
    <Link
      to={`/agent/${agent.id}`}
      className={`block p-4 rounded-xl transition-colors ${
        highlight 
          ? 'bg-amber-500/10 border border-amber-500/30' 
          : 'bg-white/5 active:bg-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{agent.projectName}</h3>
          <p className="text-sm text-white/50 truncate mt-0.5">
            {agent.type} • {formatRelativeTime(agent.lastActivityAt)}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      
      {agent.stats?.cost != null && agent.stats.cost > 0 && (
        <p className="text-xs text-white/30 mt-2">
          ${agent.stats.cost.toFixed(4)}
        </p>
      )}
    </Link>
  );
}
```

### QuickActions

```typescript
// src/mobile/components/QuickActions.tsx
import React from 'react';

interface QuickActionsProps {
  onSend: (text: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Yes', value: 'y\n' },
  { label: 'No', value: 'n\n' },
  { label: 'Continue', value: '\n' },
  { label: 'Abort', value: '\x03' }, // Ctrl+C
];

export function QuickActions({ onSend }: QuickActionsProps) {
  return (
    <div className="flex gap-2 p-3 overflow-x-auto">
      {QUICK_ACTIONS.map(action => (
        <button
          key={action.label}
          onClick={() => onSend(action.value)}
          className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium whitespace-nowrap"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

### ActivityFeed

```typescript
// src/mobile/components/ActivityFeed.tsx
import React from 'react';
import { formatRelativeTime } from '@shared/utils/format';
import type { AgentActivity } from '@shared/types';

interface ActivityFeedProps {
  activities: AgentActivity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-white/30 py-12">
        No activity yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {activities.map((activity, i) => (
        <ActivityItem key={`${activity.timestamp}-${i}`} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: AgentActivity }) {
  const icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${color}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-white/60 capitalize">
              {activity.type.replace('_', ' ')}
            </span>
            {activity.toolName && (
              <span className="text-xs text-white/40">
                {activity.toolName}
              </span>
            )}
            <span className="text-xs text-white/30 ml-auto">
              {formatRelativeTime(activity.timestamp)}
            </span>
          </div>
          {activity.content && (
            <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap break-words line-clamp-4">
              {activity.content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'assistant': return '🤖';
    case 'user': return '👤';
    case 'tool_use': return '🔧';
    case 'tool_result': return '📋';
    case 'error': return '❌';
    default: return '•';
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'error': return 'text-red-400';
    case 'tool_use': return 'text-blue-400';
    default: return 'text-white/60';
  }
}
```

---

## 9. Shared Code

### Types

```typescript
// src/shared/types/index.ts
export type AgentType = 'claude-code' | 'codex' | 'gemini' | 'unknown';
export type AgentStatus = 'active' | 'idle' | 'needs_input' | 'ended';
export type LaunchMode = 'local' | 'mobile';
export type ActivityType = 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'error';

export interface AgentInfo {
  id: string;
  type: AgentType;
  status: AgentStatus;
  projectPath: string;
  projectName: string;
  spaceId?: string;
  spaceName?: string;
  terminalId?: string;
  launchMode: LaunchMode;
  startedAt: string;
  lastActivityAt: string;
  stats?: {
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
  };
}

export interface AgentActivity {
  sessionId: string;
  type: ActivityType;
  timestamp: string;
  content?: string;
  toolName?: string;
}

export interface SpaceInfo {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  repoPath?: string;
  tabCount: number;
  agentCount: number;
}

export interface TerminalInfo {
  id: string;
  cols: number;
  rows: number;
  cwd: string;
  active: boolean;
}
```

### StatusBadge

```typescript
// src/shared/components/StatusBadge.tsx
import React from 'react';
import type { AgentStatus } from '../types';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.classes} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}

function getStatusConfig(status: AgentStatus) {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        classes: 'bg-green-500/10 text-green-400',
        dotClass: 'bg-green-400 animate-pulse',
      };
    case 'needs_input':
      return {
        label: 'Needs Input',
        classes: 'bg-amber-500/10 text-amber-400',
        dotClass: 'bg-amber-400 animate-pulse',
      };
    case 'idle':
      return {
        label: 'Idle',
        classes: 'bg-white/10 text-white/60',
        dotClass: 'bg-white/40',
      };
    case 'ended':
      return {
        label: 'Ended',
        classes: 'bg-white/5 text-white/40',
        dotClass: 'bg-white/20',
      };
  }
}
```

### Utils

```typescript
// src/shared/utils/format.ts

export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}
```

---

## 10. Push Notifications (Ntfy)

```typescript
// src/main/services/remote-server/notifications.ts

interface NtfyConfig {
  enabled: boolean;
  topic: string;
  server?: string;  // Default: https://ntfy.sh
}

let config: NtfyConfig = {
  enabled: false,
  topic: '',
  server: 'https://ntfy.sh',
};

export function setNtfyConfig(newConfig: Partial<NtfyConfig>): void {
  config = { ...config, ...newConfig };
}

export function getNtfyConfig(): NtfyConfig {
  return { ...config };
}

export async function sendNotification(options: {
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5;  // 1=min, 5=max
  tags?: string[];
  click?: string;  // URL to open on click
}): Promise<void> {
  if (!config.enabled || !config.topic) {
    return;
  }

  const { title, message, priority = 3, tags = [], click } = options;

  try {
    await fetch(`${config.server}/${config.topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': String(priority),
        ...(tags.length > 0 ? { 'Tags': tags.join(',') } : {}),
        ...(click ? { 'Click': click } : {}),
      },
      body: message,
    });
  } catch (err) {
    console.error('[Ntfy] Failed to send notification:', err);
  }
}

// Convenience functions
export async function notifyNeedsInput(agentName: string, projectName: string): Promise<void> {
  await sendNotification({
    title: `🔔 ${agentName} needs input`,
    message: projectName,
    priority: 4,
    tags: ['robot', 'warning'],
  });
}

export async function notifyAgentError(agentName: string, error: string): Promise<void> {
  await sendNotification({
    title: `❌ ${agentName} error`,
    message: error.slice(0, 200),
    priority: 5,
    tags: ['x', 'rotating_light'],
  });
}

export async function notifyAgentComplete(agentName: string, projectName: string): Promise<void> {
  await sendNotification({
    title: `✅ ${agentName} complete`,
    message: projectName,
    priority: 2,
    tags: ['white_check_mark'],
  });
}
```

### Integrate with Agent Monitor

```typescript
// In your agent monitor service, when status changes:

import { notifyNeedsInput, notifyAgentError } from './notifications';

// When agent transitions to needs_input
if (previousStatus !== 'needs_input' && newStatus === 'needs_input') {
  notifyNeedsInput(agent.type, agent.projectName);
}

// When agent has an error
if (activity.type === 'error') {
  notifyAgentError(agent.type, activity.content || 'Unknown error');
}
```

### IPC for Ntfy Config

```typescript
// Add to ipc-handlers.ts

ipcMain.handle('ntfy:get-config', () => {
  return getNtfyConfig();
});

ipcMain.handle('ntfy:set-config', (_, config: Partial<NtfyConfig>) => {
  setNtfyConfig(config);
  return { success: true };
});

ipcMain.handle('ntfy:test', async () => {
  await sendNotification({
    title: '🧪 Test Notification',
    message: 'Maestro notifications are working!',
    priority: 3,
  });
  return { success: true };
});
```

---

## 11. Tailscale Setup

### Mac (Server)

```bash
# Install
brew install tailscale

# Start and authenticate
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
# Example: 100.100.100.100

# Optional: Set a hostname
tailscale set --hostname=maestro
# Now accessible at: maestro.your-tailnet.ts.net
```

### iPhone (Client)

1. Install Tailscale from App Store
2. Sign in with same account
3. Enable VPN when prompted
4. Access Maestro at `http://100.100.100.100:7777` or `http://maestro:7777`

### Persist Connection

Tailscale stays connected in background. Phone always reaches Mac.

### Alternative: MagicDNS

Enable MagicDNS in Tailscale admin console for friendly names:
- `http://macbook:7777` instead of IP

---

## 12. PWA Manifest

```json
// src/mobile/public/manifest.json
{
  "name": "Maestro",
  "short_name": "Maestro",
  "description": "Mobile control for AI coding agents",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Add to Home Screen on iOS for app-like experience (no Safari UI).

---

## 13. Styles

```css
/* src/mobile/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
}

html, body, #root {
  height: 100%;
  overscroll-behavior: none;
}

body {
  background: #0a0a0a;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
}

/* Hide scrollbars but keep functionality */
::-webkit-scrollbar {
  display: none;
}

/* Terminal tweaks for mobile */
.xterm-viewport {
  overflow-y: auto !important;
}

/* Prevent text selection on UI elements */
button, a, [role="button"] {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Input zoom prevention on iOS */
input, textarea, select {
  font-size: 16px;
}
```

---

## Implementation Checklist

### Phase 1: Build Setup (Day 1)
- [ ] Add mobile entry point and Vite config
- [ ] Set up shared types and components
- [ ] Configure Tailwind for mobile
- [ ] Add static file serving to remote server

### Phase 2: Auth Flow (Day 1)
- [ ] Login screen with PIN input
- [ ] Auth context with localStorage
- [ ] Challenge-response token refresh
- [ ] Protected route wrapper

### Phase 3: Core Screens (Day 2)
- [ ] Agent list with status sections
- [ ] Agent detail with activity feed
- [ ] Quick actions for needs_input
- [ ] Settings screen

### Phase 4: Real-time (Day 2-3)
- [ ] WebSocket hook with auto-reconnect
- [ ] Live agent updates
- [ ] Activity stream subscription

### Phase 5: Terminal (Day 3)
- [ ] xterm.js integration
- [ ] Backlog on attach
- [ ] Input handling
- [ ] Mobile keyboard support

### Phase 6: Notifications (Day 4)
- [ ] Ntfy integration
- [ ] Config UI in desktop app
- [ ] Test notification button
- [ ] Auto-notify on needs_input

### Phase 7: Polish (Day 4-5)
- [ ] PWA manifest
- [ ] App icons
- [ ] Safe area handling
- [ ] Loading states
- [ ] Error handling
- [ ] Tailscale docs

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```
