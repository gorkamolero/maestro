# Remote View Integration Context

## 1. Project Structure

### Directory Tree (`src/`)
```
src/
├── App.css
├── App.tsx
├── app/
│   └── globals.css
├── assets/
├── components/
│   ├── Browser/
│   │   ├── BrowserPanel.tsx
│   │   ├── BrowserToolbar.tsx
│   │   ├── browser.utils.ts
│   │   ├── index.ts
│   │   └── useWebview.ts
│   ├── CommandPalette/
│   ├── ControlRoom/
│   ├── Launcher/
│   ├── MobileSyncButton.tsx
│   ├── PortalWindow.tsx
│   ├── SpaceSync.tsx
│   ├── StatusBar.tsx
│   ├── Terminal/
│   ├── View.tsx
│   ├── Window/
│   └── ...
├── hooks/
├── index.css
├── index.tsx
├── ipc/
│   ├── agent-monitor.ts
│   ├── agent.ts
│   ├── browser.ts
│   ├── launcher.ts
│   ├── performance.ts
│   ├── portal.ts
│   ├── remote-server.ts
│   ├── space-sync.ts
│   └── terminal.ts
├── lib/
├── main.ts
├── mobile/
├── preload.ts
├── services/
│   ├── remote-server/
│   │   ├── auth/
│   │   ├── index.ts
│   │   ├── notifications.ts
│   │   ├── routes/
│   │   ├── terminal/
│   │   └── websocket/
│   └── ...
├── shared/
├── stores/
│   ├── browser.store.ts
│   ├── spaces.store.ts
│   ├── workspace.store.ts
│   └── ...
├── types/
│   ├── index.ts
│   └── ...
└── vite-env.d.ts
```

### Key Process Files
- **Electron Main Process**: `src/main.ts`
- **Renderer Process**: `src/App.tsx` (entry point)

## 2. IPC Pattern

IPC handlers are defined in `src/ipc/` and registered in `src/main.ts`. The `preload.ts` exposes them via `contextBridge`.

### FILE: src/main.ts
```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerBrowserHandlers, getBrowserViewsMap } from './ipc/browser';
import { registerTerminalHandlers } from './ipc/terminal';
import { registerLauncherHandlers } from './ipc/launcher';
import { registerPortalHandler } from './ipc/portal';
import { registerAgentHandlers } from './ipc/agent';
import { registerAgentMonitorHandlers, cleanupAgentMonitorHandlers } from './ipc/agent-monitor';
import { registerPerformanceHandlers, cleanupPerformanceHandlers } from './ipc/performance';
import { registerRemoteServerIPC } from './ipc/remote-server';
import { registerSpaceSyncIPC } from './ipc/space-sync';
import { remoteServer } from './services/remote-server';

// Get icon path - different in dev vs production
const getIconPath = () => {
  if (app.isPackaged) {
    // In production, resources are in the app's resources folder
    return path.join(process.resourcesPath, 'resources', 'icon.png');
  }
  // In development, use the source resources folder
  return path.join(__dirname, '..', '..', 'resources', 'icon.png');
};

// Handle creating/removing shortcuts on Windows
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const getMainWindow = () => mainWindow;

const createWindow = () => {
  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true, // Enable to allow node-pty in preload
      sandbox: false, // Disable sandbox to allow native modules like node-pty
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// App lifecycle
app.on('ready', () => {
  // Create window first
  createWindow();

  // Register portal handler to intercept window.open()
  registerPortalHandler(getMainWindow);

  // Then register IPC handlers
  registerBrowserHandlers(getMainWindow);
  registerTerminalHandlers(getMainWindow);
  registerLauncherHandlers();
  registerAgentHandlers(getMainWindow);
  registerAgentMonitorHandlers(getMainWindow);
  registerPerformanceHandlers(getMainWindow, getBrowserViewsMap);
  registerRemoteServerIPC();
  registerSpaceSyncIPC(getMainWindow);

  // Auto-start remote server for mobile connections
  remoteServer.start().then(() => {
    console.log('[Main] Remote server started');
  }).catch(err => {
    console.error('[Main] Failed to start remote server:', err);
  });
});

app.on('window-all-closed', () => {
  cleanupPerformanceHandlers();
  cleanupAgentMonitorHandlers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### FILE: src/preload.ts
```ts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

// ============================================================================ 
// Expose Electron APIs to renderer
// ============================================================================ 

contextBridge.exposeInMainWorld('electron', {
  // IPC invoke (for request-response)
  invoke: (channel: string, args?: unknown) => ipcRenderer.invoke(channel, args),

  // IPC send (for one-way messages to main)
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args);
  },

  // IPC on (for events from main)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => {
      callback(...args);
    };
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },
});

// ... (Agent and PTY APIs omitted for brevity) ...

// ============================================================================ 
// Expose Remote Server API
// ============================================================================ 

contextBridge.exposeInMainWorld('remoteServer', {
  start: (port?: number) => ipcRenderer.invoke('remote-server:start', port),
  stop: () => ipcRenderer.invoke('remote-server:stop'),
  startPairing: (remote: boolean) => ipcRenderer.invoke('remote-server:start-pairing', remote),
  stopPairing: () => ipcRenderer.invoke('remote-server:stop-pairing'),
  getPairingStatus: () => ipcRenderer.invoke('remote-server:pairing-status'),
  getConnectionInfo: () => ipcRenderer.invoke('remote-server:connection-info'),
});
```

### FILE: src/ipc/browser.ts
(See below in Section 3)

## 3. BrowserView Management

BrowserViews are managed in `src/ipc/browser.ts`. This file maintains a `Map` of active views and handles their creation, resizing, and destruction.

### FILE: src/ipc/browser.ts
```ts
import { ipcMain, BrowserWindow, BrowserView, session } from 'electron';

// ============================================================================ 
// Types
// ============================================================================ 

interface ViewInfo {
  view: BrowserView;
  label: string;
  zIndex: number;
  mode: 'maximized' | 'floating';
  isVisible: boolean;
}

// ============================================================================ 
// State
// ============================================================================ 

const browserViews = new Map<string, ViewInfo>();
const creatingViews = new Set<string>();
let nextZIndex = 1;

/**
 * Get the browser views map for external access (e.g., performance monitoring)
 */
export function getBrowserViewsMap(): Map<string, { view: BrowserView; label: string }> {
  const result = new Map<string, { view: BrowserView; label: string }>();
  for (const [label, info] of browserViews) {
    result.set(label, { view: info.view, label: info.label });
  }
  return result;
}

// ============================================================================ 
// Helpers
// ============================================================================ 

/**
 * Reorder all views based on their z-index.
 * Maximized views are always behind floating views.
 * Portals are handled separately by portal.ts and are always on top.
 */
function reorderViews(mainWindow: BrowserWindow) {
  // Get all visible views sorted by z-index
  const visibleViews = Array.from(browserViews.values())
    .filter((v) => v.isVisible)
    .sort((a, b) => {
      // Maximized views always come first (lower z-order)
      if (a.mode === 'maximized' && b.mode !== 'maximized') return -1;
      if (a.mode !== 'maximized' && b.mode === 'maximized') return 1;
      // Then sort by zIndex
      return a.zIndex - b.zIndex;
    });

  // Remove all browser views
  for (const viewInfo of browserViews.values()) {
    try {
      mainWindow.removeBrowserView(viewInfo.view);
    } catch {
      // View may already be removed
    }
  }

  // Re-add in correct order (last added is on top)
  for (const viewInfo of visibleViews) {
    mainWindow.addBrowserView(viewInfo.view);
  }

  // Set the topmost as top (for proper input handling)
  if (visibleViews.length > 0) {
    mainWindow.setTopBrowserView(visibleViews[visibleViews.length - 1].view);
  }
}

// ============================================================================ 
// IPC Handlers
// ============================================================================ 

export function registerBrowserHandlers(getMainWindow: () => BrowserWindow | null) {
  /**
   * Create or show a browser view
   * Now supports multiple views with mode parameter
   */
  ipcMain.handle('create_browser_view', async (_event, options) => {
    const { label, url, x, y, width, height, partition, mode = 'floating' } = options;
    const mainWindow = getMainWindow();

    if (!mainWindow) return label;

    // Prevent duplicate creation (race condition from React StrictMode)
    if (creatingViews.has(label)) {
      return label;
    }

    // Check if view already exists - if so, update it and show it
    const existingInfo = browserViews.get(label);
    if (existingInfo) {
      existingInfo.mode = mode;
      existingInfo.zIndex = nextZIndex++;
      existingInfo.isVisible = true;

      existingInfo.view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });

      reorderViews(mainWindow);
      existingInfo.view.webContents.focus();

      return label;
    }

    // Mark as creating BEFORE any work
    creatingViews.add(label);

    // If maximized mode, hide other maximized views (but keep floating ones)
    if (mode === 'maximized') {
      for (const [otherLabel, info] of browserViews.entries()) {
        if (otherLabel !== label && info.mode === 'maximized' && info.isVisible) {
          info.isVisible = false;
        }
      }
    }

    // Get or create session for this profile's partition
    const sessionPartition = partition || 'persist:default';
    const browserSession = session.fromPartition(sessionPartition);

    // Create new view with profile-specific session
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: browserSession,
      },
    });

    const viewInfo: ViewInfo = {
      view,
      label,
      zIndex: nextZIndex++,
      mode,
      isVisible: true,
    };

    browserViews.set(label, viewInfo);

    view.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });

    reorderViews(mainWindow);

    await view.webContents.loadURL(url);

    // Done creating
    creatingViews.delete(label);

    // Listen to ALL navigation events to keep URL and history synced
    const sendNavigationUpdate = () => {
      const currentUrl = view.webContents.getURL();
      const entries = view.webContents.navigationHistory.getAllEntries();
      const activeIndex = view.webContents.navigationHistory.getActiveIndex();

      mainWindow?.webContents.send('browser-navigation-updated', {
        label,
        url: currentUrl,
        history: {
          entries,
          activeIndex,
        },
      });
    };

    view.webContents.on('did-navigate', sendNavigationUpdate);
    view.webContents.on('did-navigate-in-page', sendNavigationUpdate);

    // Focus event handling
    view.webContents.on('focus', () => {
      mainWindow?.webContents.send('browser-view-focus-changed', { label, focused: true });
    });

    view.webContents.on('blur', () => {
      mainWindow?.webContents.send('browser-view-focus-changed', { label, focused: false });
    });

    return label;
  });

  // ... (Other handlers omitted for brevity: close, update_bounds, etc.)
}
```

## 4. Remote Server

A Hono + WebSocket server is already implemented in `src/services/remote-server/`.

### FILE: src/services/remote-server/index.ts
```ts
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';
import os from 'os';
import { app as electronApp } from 'electron'; // Alias 'app' to 'electronApp' to avoid conflict with hono 'app'
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs/promises';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

import { authRouter } from './auth/routes';
import { authMiddleware } from './auth/middleware';
import { agentsRouter } from './routes/agents';
import { spacesRouter } from './routes/spaces';
import { systemRouter } from './routes/system';
import { wsManager } from './websocket/handler';
import { terminalBridge } from './terminal/bridge';
import { startPairing, stopPairing, getPairingStatus } from './auth/pairing';

const DEFAULT_PORT = 7777;

class RemoteServer {
  private app: Hono;
  private server: ReturnType<typeof serve> | null = null;
  private wss: WebSocketServer | null = null;
  private port: number = DEFAULT_PORT;
  
  constructor() {
    this.app = new Hono();
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  private setupMiddleware() {
    this.app.use('*', cors({
      origin: '*',  // Mobile apps
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Maestro-Client'],
    }));
  }
  
  private setupRoutes() {
    // Public routes
    this.app.route('/auth', authRouter);
    
    // Public health check
    this.app.get('/api/health', (c) => {
      return c.json({
        status: 'healthy',
        version: electronApp.getVersion(),
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });
    
    // Protected routes
    this.app.use('/api/*', authMiddleware);
    this.app.route('/api/agents', agentsRouter);
    this.app.route('/api/spaces', spacesRouter);
    this.app.route('/api', systemRouter);

    // Serve mobile UI for all non-API routes
    const mobilePath = electronApp.isPackaged
      ? path.join(process.resourcesPath, 'mobile') // In packaged app, it's in Resources/mobile
      : path.join(__dirname, '../../../../dist/mobile');

    // Static assets - serve from root to handle manifest.json, icons, etc.
    this.app.use('/*', serveStatic({ root: mobilePath, stripEmptyParams: true }));
    
    // SPA fallback - serve index.html for all other routes
    this.app.get('*', async (c) => {
      const indexPath = path.join(mobilePath, 'index.html');
      try {
        const html = await fs.readFile(indexPath, 'utf8');
        return c.html(html);
      } catch (e) {
        console.error('Failed to serve mobile index.html:', e);
        return c.text('Mobile UI not found', 404);
      }
    });
  }
  
  async start(port: number = DEFAULT_PORT): Promise<void> {
    this.port = port;
    
    return new Promise((resolve) => {
      this.server = serve({
        fetch: this.app.fetch,
        port,
        hostname: '0.0.0.0',
      }, () => {
        console.log(`[RemoteServer] Listening on port ${port}`);
        this.setupWebSocket();
        resolve();
      });
    });
  }
  
  private setupWebSocket() {
    if (!this.server) return;
    
    this.wss = new WebSocketServer({ noServer: true });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.server as any).on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
      const url = new URL(request.url || '', `http://localhost:${this.port}`);
      
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }
      
      const token = url.searchParams.get('token');
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      if (this.wss) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          wsManager.handleUpgrade(ws, token);
        });
      }
    });
  }
  
  stop(): void {
    wsManager.dispose();
    terminalBridge.dispose();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
  
  // Pairing UI helpers
  startPairing(remote = false): { pin: string; expiresAt: string; remoteToken?: string } {
    return startPairing({ remote });
  }
  
  stopPairing(): void {
    stopPairing();
  }
  
  getPairingStatus() {
    return getPairingStatus();
  }
  
  getConnectionInfo(): { urls: string[]; port: number } {
    const urls: string[] = [];
    const nets = os.networkInterfaces();
    
    Object.values(nets).forEach(ifaces => {
      ifaces?.forEach(addr => {
        if (addr.family === 'IPv4' && !addr.internal) {
          urls.push(`http://${addr.address}:${this.port}`);
        }
      });
    });
    
    return { urls, port: this.port };
  }
}

export const remoteServer = new RemoteServer();
```

### FILE: src/services/remote-server/websocket/handler.ts
```ts
import { WebSocket } from 'ws';
import crypto from 'crypto';
import { verifyAccessToken } from '../auth/token';
import { getDevice, updateLastSeen } from '../auth/device-registry';
import { envelope, WSEnvelope } from './protocol';
import { terminalBridge } from '../terminal/bridge';

interface WSClient {
  ws: WebSocket;
  clientId: string;
  deviceId: string;
  subscriptions: Set<string>;  // e.g., "agents", "terminal:term-123"
  lastPing: number;
}

class WSManager {
  private clients = new Map<string, WSClient>();
  private pingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Keepalive: ping every 30s
    this.pingInterval = setInterval(() => this.pingAll(), 30_000);
  }
  
  async handleUpgrade(ws: WebSocket, token: string): Promise<boolean> {
    const payload = await verifyAccessToken(token);
    if (!payload) {
      ws.close(4401, 'invalid_token');
      return false;
    }
    
    const device = getDevice(payload.deviceId);
    if (!device || device.revoked) {
      ws.close(4401, 'device_revoked');
      return false;
    }
    
    const clientId = crypto.randomUUID();
    const client: WSClient = {
      ws,
      clientId,
      deviceId: payload.deviceId,
      subscriptions: new Set(),
      lastPing: Date.now(),
    };
    
    this.clients.set(clientId, client);
    updateLastSeen(payload.deviceId);
    
    // Send connected message
    this.send(clientId, 'connected', { clientId });
    
    ws.on('message', (data) => this.handleMessage(clientId, data.toString()));
    ws.on('close', () => this.handleClose(clientId));
    ws.on('error', () => this.handleClose(clientId));
    
    return true;
  }
  
  private handleMessage(clientId: string, raw: string) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      }
    } catch (e) {
      this.send(clientId, 'error', { code: 'parse_error', message: 'Invalid message' });
    }
  }
  
  private handleSubscribe(client: WSClient, payload: { channel: string; id?: string }) {
    const key = payload.id ? `${payload.channel}:${payload.id}` : payload.channel;
    client.subscriptions.add(key);
    this.send(client.clientId, 'subscribed', payload);
    
    // If subscribing to a terminal, send backlog
    if (payload.channel === 'terminal' && payload.id) {
      terminalBridge.sendBacklog(client.clientId, payload.id);
    }
  }
  
  private handleUnsubscribe(client: WSClient, payload: { channel: string; id?: string }) {
    const key = payload.id ? `${payload.channel}:${payload.id}` : payload.channel;
    client.subscriptions.delete(key);
  }
  
  private handleTerminalInput(payload: { id: string; data: string; seq?: number }) {
    // Forward to terminal bridge
    terminalBridge.write(payload.id, payload.data);
  }
  
  private handleTerminalResize(payload: { id: string; cols: number; rows: number }) {
    terminalBridge.resize(payload.id, payload.cols, payload.rows);
  }
  
  private handleClose(clientId: string) {
    this.clients.delete(clientId);
  }
  
  private pingAll() {
    const now = Date.now();
    for (const [clientId, client] of this.clients) {
      // Close stale connections (no ping in 60s)
      if (now - client.lastPing > 60_000) {
        client.ws.close(4000, 'ping_timeout');
        this.clients.delete(clientId);
        continue;
      }
    }
  }
  
  // Send to specific client
  send(clientId: string, type: string, payload: unknown) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;
    
    client.ws.send(JSON.stringify(envelope(type, payload)));
  }
  
  // Broadcast to subscribers of a channel
  broadcast(channel: string, type: string, payload: unknown) {
    const msg = JSON.stringify(envelope(type, payload));
    
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }
  
  // Broadcast to subscribers of a specific ID channel
  broadcastToId(channel: string, id: string, type: string, payload: unknown) {
    const key = `${channel}:${id}`;
    const msg = JSON.stringify(envelope(type, payload));
    
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(key) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }
  
  getClientCount(): number {
    return this.clients.size;
  }
  
  dispose() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'server_shutdown');
    }
    this.clients.clear();
  }
}

export const wsManager = new WSManager();
```

### FILE: src/services/remote-server/auth/routes.ts
```ts
import { Hono } from 'hono';
import crypto from 'crypto';
import { getDevice, registerDevice, updateLastSeen } from './device-registry';
import { isPairingActive, verifyPin, verifyRemoteToken, getPairingStatus } from './pairing';
import { signAccessToken } from './token';

export const authRouter = new Hono();

// Check pairing status (public)
authRouter.get('/pair/status', (c) => {
  const status = getPairingStatus();
  return c.json(status, 200, {
    'Cache-Control': 'no-store',
  });
});

// Pair device (during active pairing window)
authRouter.post('/pair', async (c) => {
  if (!isPairingActive()) {
    return c.json({ error: 'pairing_not_active' }, 403);
  }
  
  const body = await c.req.json<{ 
    deviceId: string;
    pin: string;
    name?: string;
    platform?: 'ios' | 'android';
    remoteToken?: string;
  }>();
  
  if (!body.deviceId || !body.pin) {
    return c.json({ error: 'invalid_input' }, 400);
  }
  
  // Remote pairing requires token
  if (body.remoteToken && !verifyRemoteToken(body.remoteToken)) {
    return c.json({ error: 'invalid_remote_token' }, 403);
  }
  
  if (!verifyPin(body.pin)) {
    return c.json({ error: 'invalid_pin' }, 401);
  }
  
  const device = registerDevice({
    deviceId: body.deviceId,
    name: body.name,
    platform: body.platform,
  });
  
  return c.json({
    success: true,
    deviceId: device.deviceId,
    secret: device.secret,  // Client stores this permanently
  });
});

// Request challenge nonce
authRouter.post('/challenge', async (c) => {
  const { deviceId } = await c.req.json<{ deviceId: string }>();
  
  if (!deviceId) {
    return c.json({ error: 'invalid_input' }, 400);
  }
  
  const device = getDevice(deviceId);
  if (!device || device.revoked) {
    return c.json({ error: 'device_not_registered' }, 401);
  }
  
  const nonce = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  
  return c.json({ nonce, expiresAt });
});

// Exchange signature for JWT
authRouter.post('/token', async (c) => {
  const { deviceId, nonce, signature } = await c.req.json<{ 
    deviceId: string;
    nonce: string;
    signature: string;
  }>();
  
  if (!deviceId || !nonce || !signature) {
    return c.json({ error: 'invalid_input' }, 400);
  }
  
  const device = getDevice(deviceId);
  if (!device || device.revoked) {
    return c.json({ error: 'device_not_registered' }, 401);
  }
  
  // Verify: signature = sha256(secret + "\n" + deviceId + "\n" + nonce)
  const expected = crypto
    .createHash('sha256')
    .update(`${device.secret}\n${deviceId}\n${nonce}`)
    .digest('hex');
  
  const sig = signature.toLowerCase();
  if (expected.length !== sig.length) {
    return c.json({ error: 'invalid_signature' }, 401);
  }
  
  const valid = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(sig, 'hex')
  );
  
  if (!valid) {
    return c.json({ error: 'invalid_signature' }, 401);
  }
  
  updateLastSeen(deviceId);
  const { token, expiresAt } = await signAccessToken({ deviceId });
  
  return c.json({ token, expiresAt });
});

// Check device status
authRouter.get('/device/status', async (c) => {
  const deviceId = c.req.query('deviceId');
  if (!deviceId) {
    return c.json({ registered: false });
  }
  
  const device = getDevice(deviceId);
  return c.json({ registered: !!device && !device.revoked });
});
```

## 5. State Management

State is managed using `valtio`. The renderer uses this store, and often syncs changes to the Main process via IPC calls in effects or actions.

### FILE: src/stores/spaces.store.ts
```ts
import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { Space, Segment, SpaceContentMode } from '@/types';
import { SPACE_COLOR_PALETTE } from '@/types';
import { closeSpaceTabs } from '@/services/space-cleanup.service';

export type SpacesViewMode = 'cards' | 'panes';

interface SpacesState {
  spaces: Space[];
  viewMode: SpacesViewMode;
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: spacesHistory } = await persistWithHistory<SpacesState>(
  {
    spaces: [],
    viewMode: 'cards',
  },
  'maestro-spaces',
  {
    debounceTime: 1000,
  }
);

// Migrate old spaces
const migrateSpaces = () => {
  const store = spacesHistory.value;
  let needsMigration = false;

  store.spaces.forEach((space, index) => {
    // Migrate old `color` field to `primaryColor`/`secondaryColor`
    const spaceAny = space as Space & { color?: string };
    if (spaceAny.color && !space.primaryColor) {
      needsMigration = true;
      const palette = SPACE_COLOR_PALETTE[index % SPACE_COLOR_PALETTE.length];
      space.primaryColor = palette.primary;
      space.secondaryColor = palette.secondary;
      delete spaceAny.color;
    }

    // Add `next` field if missing
    if (space.next === undefined) {
      needsMigration = true;
      space.next = null;
    }

    // Add `lastActiveAt` field if missing
    if (space.lastActiveAt === undefined) {
      needsMigration = true;
      space.lastActiveAt = null;
    }

    // Add `isActive` field if missing (default to true)
    if (space.isActive === undefined) {
      needsMigration = true;
      space.isActive = true;
    }
  });

  if (needsMigration) {
    spacesHistory.saveHistory();
  }
};

// Run migration on load
migrateSpaces();

export { spacesHistory };

// Getter that always returns current value (important after undo/redo which replaces .value)
export const getSpacesStore = () => spacesHistory.value;

/**
 * Get next color pair for a new space (cycles through palette)
 */
export const getNextColorPair = () => {
  const store = getSpacesStore();
  const index = store.spaces.length % SPACE_COLOR_PALETTE.length;
  return SPACE_COLOR_PALETTE[index];
};

/**
 * Hook to get reactive spaces state. Use this instead of useSnapshot(spacesStore).
 */
export function useSpacesStore() {
  const { value } = useSnapshot(spacesHistory);
  return value;
}

export const spacesActions = {
  addSpace: (name: string, profileId?: string): Space => {
    const store = getSpacesStore();
    const colorPair = getNextColorPair();
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      profileId,
      position: store.spaces.length,
      primaryColor: colorPair.primary,
      secondaryColor: colorPair.secondary,
      segments: [],
      markers: [],
      next: null,
      lastActiveAt: new Date().toISOString(),
      isActive: true,
    };
    store.spaces.push(newSpace);
    return newSpace;
  },

  /**
   * Assign a profile to a space
   */
  setSpaceProfile: (spaceId: string, profileId: string | undefined): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.profileId = profileId;
    }
  },

  removeSpace: (spaceId: string): void => {
    const store = getSpacesStore();
    store.spaces = store.spaces.filter((t) => t.id !== spaceId);
  },

  updateSpace: (spaceId: string, updates: Partial<Space>): void => {
    const store = getSpacesStore();
    const index = store.spaces.findIndex((t) => t.id === spaceId);
    if (index !== -1) {
      store.spaces[index] = { ...store.spaces[index], ...updates };
    }
  },

  reorderSpaces: (spaces: Space[]): void => {
    const store = getSpacesStore();
    store.spaces = spaces;
  },

  addSegment: (spaceId: string, segment: Segment): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments.push(segment);
    }
  },

  removeSegment: (spaceId: string, segmentId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments = space.segments.filter((s) => s.id !== segmentId);
    }
  },

  updateSegment: (spaceId: string, segmentId: string, updates: Partial<Segment>): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      const index = space.segments.findIndex((s) => s.id === segmentId);
      if (index !== -1) {
        space.segments[index] = { ...space.segments[index], ...updates };
      }
    }
  },

  /**
   * Set the "what's next" text for a space
   */
  setSpaceNext: (spaceId: string, next: string | null): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.next = next;
    }
  },

  /**
   * Update the last active timestamp for a space
   */
  updateSpaceLastActive: (spaceId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.lastActiveAt = new Date().toISOString();
    }
  },

  /**
   * Add a coding path to a space's recent paths (keeps last 5, most recent first)
   */
  addRecentCodingPath: (spaceId: string, path: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      const paths = space.recentCodingPaths || [];
      // Remove if already exists (will re-add at front)
      const filtered = paths.filter((p) => p !== path);
      // Add to front and keep max 5
      space.recentCodingPaths = [path, ...filtered].slice(0, 5);
    }
  },

  /**
   * Get recent coding paths for a space
   */
  getRecentCodingPaths: (spaceId: string): string[] => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    return space?.recentCodingPaths || [];
  },

  /**
   * Set the view mode for spaces (cards or panes)
   */
  setViewMode: (mode: SpacesViewMode): void => {
    const store = getSpacesStore();
    store.viewMode = mode;
  },

  /**
   * Set the content mode for a space (tasks or notes)
   */
  setSpaceContentMode: (spaceId: string, mode: SpaceContentMode): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.contentMode = mode;
    }
  },

  /**
   * Update the notes content for a space
   */
  setSpaceNotesContent: (spaceId: string, content: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.notesContent = content;
    }
  },

  /**
   * Get the notes content for a space
   */
  getSpaceNotesContent: (spaceId: string): string | undefined => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    return space?.notesContent;
  },

  /**
   * Add a tag to a space
   */
  addTag: (spaceId: string, tagId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      if (!space.tags) {
        space.tags = [];
      }
      if (!space.tags.includes(tagId)) {
        space.tags.push(tagId);
      }
    }
  },

  /**
   * Remove a tag from a space
   */
  removeTag: (spaceId: string, tagId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space && space.tags) {
      space.tags = space.tags.filter((t) => t !== tagId);
    }
  },

  /**
   * Toggle a tag on a space
   */
  toggleTag: (spaceId: string, tagId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      if (!space.tags) {
        space.tags = [];
      }
      const index = space.tags.indexOf(tagId);
      if (index === -1) {
        space.tags.push(tagId);
      } else {
        space.tags.splice(index, 1);
      }
    }
  },

  /**
   * Deactivate a space (move to vault)
   * This closes all browser views, terminals, and agents in the space
   */
  deactivateSpace: async (spaceId: string): Promise<void> => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (!space) return;

    // First, close all resources (browser views, agents, etc.)
    await closeSpaceTabs(spaceId);

    // Then mark as inactive
    space.isActive = false;
  },

  /**
   * Activate a space (restore from vault)
   */
  activateSpace: (spaceId: string): void => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.isActive = true;
    }
  },

  /**
   * Get all inactive spaces (vault)
   */
  getInactiveSpaces: (): Space[] => {
    const store = getSpacesStore();
    return store.spaces.filter((s) => s.isActive === false);
  },
};
```

## 6. Types

### FILE: src/types/index.ts
```ts
// Core Types
import type { Tab } from '@/stores/workspace.store';

// ============================================================================= 
// Profile - Top-level organizational unit (like Arc browser profiles)
// ============================================================================= 

export interface Profile {
  id: string;
  name: string;
  /** Optional avatar/icon for the profile */
  avatar?: string;
  /** Color theme for visual distinction */
  color: string;
  /** Electron session partition name for browser isolation */
  sessionPartition: string;
  /** Profile-specific settings */
  settings: ProfileSettings;
  /** Creation timestamp */
  createdAt: string;
  /** Last active timestamp */
  lastActiveAt: string;
}

export interface ProfileSettings {
  /** Default search engine */
  searchEngine: 'google' | 'duckduckgo' | 'bing' | 'custom';
  customSearchUrl?: string;
  /** Default browser homepage */
  homepage: string;
  /** Enable/disable cookies */
  cookiesEnabled: boolean;
  /** Enable/disable JavaScript */
  javascriptEnabled: boolean;
  /** Block third-party cookies */
  blockThirdPartyCookies: boolean;
  /** User agent override (optional) */
  userAgent?: string;
  /** Proxy settings (optional) */
  proxy?: ProxySettings;
  /** Enabled Chrome extensions (extension IDs) */
  enabledExtensions: string[];
}

export interface ProxySettings {
  mode: 'direct' | 'system' | 'manual';
  server?: string;
  port?: number;
  bypassList?: string[];
}

/** Default settings for new profiles */
export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  searchEngine: 'google',
  homepage: 'about:blank',
  cookiesEnabled: true,
  javascriptEnabled: true,
  blockThirdPartyCookies: false,
  enabledExtensions: [],
};

/** Profile color palette */
export const PROFILE_COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
] as const;

// ============================================================================= 
// Workspace - Container for Spaces (belongs to a Profile)
// ============================================================================= 

export interface Workspace {
  id: string;
  name: string;
  /** Profile this workspace belongs to */
  profileId: string;
  spaces: Space[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================= 
// Tag - Category/label for organizing spaces
// ============================================================================= 

export interface Tag {
  id: string;
  name: string;
  /** Color for the tag badge */
  color: string;
}

/** Default tag color palette */
export const TAG_COLOR_PALETTE = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#84cc16', // Lime
] as const;

// ============================================================================= 
// Space - Organizational unit within a Workspace
// ============================================================================= 

/** View mode for space content area */
export type SpaceContentMode = 'tasks' | 'notes';

export interface Space {
  id: string;
  name: string;
  /** Profile this space belongs to (denormalized for quick access) */
  profileId?: string;
  position: number;
  primaryColor: string;
  secondaryColor: string;
  icon?: string;
  segments: Segment[];
  markers: Marker[];
  preferredApps?: {
    browser?: string;
    terminal?: string;
    editor?: string;
  };
  /** The "what's next" text for Control Room view */
  next: string | null;
  /** Last active timestamp for warmth calculation */
  lastActiveAt: string | null;
  /** Recently used coding paths for agent tasks (most recent first) */
  recentCodingPaths?: string[];
  /** Current content view mode (tasks or notes) */
  contentMode?: SpaceContentMode;
  /** Serialized Lexical editor state for notes */
  notesContent?: string;
  /** Tag IDs assigned to this space */
  tags?: string[];
  /** Whether the space is active (visible in main view) or in the vault */
  isActive?: boolean;
  /** Connected repository for agent monitoring */
  connectedRepo?: {
    /** Absolute path to the repository */
    path: string;
    /** When the repo was connected */
    connectedAt: string;
    /** Whether agent monitoring is enabled */
    monitorAgents: boolean;
  };
}

// Color palette for spaces - 8 professional color pairs
export const SPACE_COLOR_PALETTE = [
  { name: 'Indigo', primary: '#6366f1', secondary: '#4338ca' },
  { name: 'Emerald', primary: '#10b981', secondary: '#047857' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#e11d48' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Cyan', primary: '#06b6d4', secondary: '#0891b2' },
  { name: 'Coral', primary: '#fb7185', secondary: '#f472b6' },
  { name: 'Sage', primary: '#84cc16', secondary: '#65a30d' },
] as const;

export interface Segment {
  id: string;
  spaceId: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  type: SegmentType;
  status: SegmentStatus;
  config: SegmentConfig;
}

export type SegmentType = 'browser' | 'terminal' | 'agent' | 'note' | 'external' | 'planted';

export type SegmentStatus = 'active' | 'paused' | 'completed' | 'agent-working' | 'scheduled';

export interface SegmentConfig {
  // Browser
  urls?: string[];
  tabs?: BrowserTab[];

  // Terminal
  commands?: string[];
  workingDir?: string;
  env?: Record<string, string>;
  terminalBuffer?: string;
  terminalTheme?: 'termius-dark' | 'dracula' | 'nord';
  terminalScrollPosition?: number;

  // Agent
  agentType?: 'claude-code' | 'codex' | 'cursor';
  agentTask?: string;

  // External
  appName?: string;
  appPath?: string;
  files?: string[];

  // Planted
  trigger?: TriggerConfig;

  // Note
  content?: string;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

export interface TriggerConfig {
  type: 'time' | 'event' | 'manual';
  time?: Date;
  recurring?: 'daily' | 'weekly';
  eventId?: string;
}

export interface Marker {
  id: string;
  spaceId: string;
  time: Date;
  type: 'deadline' | 'milestone' | 'note';
  title: string;
  description?: string;
  color?: string;
}

export type ZoomLevel = 'hour' | 'day' | 'week' | 'month';

// Drag and drop types
export type TabDropZone = 'favorites' | 'tabs';

export interface TabDragData {
  type: 'tab';
  tabId: string;
  sourceZone: TabDropZone;
  sourceIndex: number;
  tab: Tab; // Full tab object for preview
}

export interface DropZoneData {
  zoneType: TabDropZone;
  spaceId: string;
}
```

## 7. Package.json

### FILE: package.json
```json
{
  "name": "maestro",
  "productName": "Maestro",
  "version": "1.0.1",
  "description": "A workspace browser for focused productivity",
  "main": ".vite/build/main.js",
  "scripts": {
    "start": "electron-forge start",
    "dev": "electron-forge start",
    "dev:mobile": "vite --config src/mobile/vite.config.mts",
    "dev:all": "concurrently -n desktop,mobile -c blue,green \"MAESTRO_DEV_AUTH_BYPASS=true pnpm dev\" \"MAESTRO_DEV_AUTH_BYPASS=true pnpm dev:mobile\"",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "publish": "electron-forge publish",
    "build": "npm run build:mobile && npm run make",
    "build:mobile": "vite build --config src/mobile/vite.config.mts",
    "lint": "eslint --ext .ts,.tsx .",
    "update-happy": "bash scripts/update-happy-claude.sh",
    "deploy": "npm run build && rm -rf /Applications/Maestro.app && cp -R out/Maestro-darwin-arm64/Maestro.app /Applications/"
  },
  "keywords": [],
  "author": {
    "name": "gorkamolero",
    "email": "gorka.molero@gmail.com"
  },
  "license": "MIT",
  "devDependencies": {
    "@electron-forge/cli": "^7.10.2",
    "@electron-forge/maker-deb": "^7.10.2",
    "@electron-forge/maker-rpm": "^7.10.2",
    "@electron-forge/maker-squirrel": "^7.10.2",
    "@electron-forge/maker-zip": "^7.10.2",
    "@electron-forge/plugin-auto-unpack-natives": "^7.10.2",
    "@electron-forge/plugin-fuses": "^7.10.2",
    "@electron-forge/plugin-vite": "^7.10.2",
    "@electron/fuses": "^1.8.0",
    "@electron/rebuild": "^4.0.1",
    "@playwright/test": "^1.56.1",
    "@types/color": "^4.2.0",
    "@types/electron-squirrel-startup": "^1.0.2",
    "@types/lodash": "^4.17.21",
    "@typescript-eslint/eslint-plugin": "^5.62.0",
    "@typescript-eslint/parser": "^5.62.0",
    "@vitejs/plugin-react": "^5.1.1",
    "concurrently": "^9.2.1",
    "electron": "39.2.3",
    "eslint": "^8.57.1",
    "eslint-plugin-import": "^2.32.0",
    "eslint-plugin-react-hooks": "^7.0.1",
    "playwright": "^1.56.1",
    "typescript": "~4.5.4",
    "vite": "^5.4.21"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.53",
    "@anthropic-ai/claude-code": "^2.0.54",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@fontsource-variable/inter": "^5.2.8",
    "@fontsource-variable/jetbrains-mono": "^5.2.8",
    "@hono/node-server": "^1.19.6",
    "@lexical/code": "^0.38.2",
    "@lexical/file": "^0.38.2",
    "@lexical/hashtag": "^0.38.2",
    "@lexical/link": "^0.38.2",
    "@lexical/list": "^0.38.2",
    "@lexical/markdown": "^0.38.2",
    "@lexical/overflow": "^0.38.2",
    "@lexical/react": "^0.38.2",
    "@lexical/rich-text": "^0.38.2",
    "@lexical/selection": "^0.38.2",
    "@lexical/table": "^0.38.2",
    "@lexical/text": "^0.38.2",
    "@lexical/utils": "^0.38.2",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@radix-ui/react-use-controllable-state": "^1.2.2",
    "@tailwindcss/vite": "^4.1.17",
    "@types/uuid": "^10.0.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-search": "^0.15.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@xterm/addon-webgl": "^0.18.0",
    "@xterm/xterm": "^5.5.0",
    "active-win": "^8.2.1",
    "ai": "^5.0.104",
    "animejs": "^4.2.2",
    "app-bundle-info": "^0.2.2",
    "array-move": "^4.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "color": "^5.0.3",
    "electron-squirrel-startup": "^1.0.1",
    "eventemitter3": "^5.0.1",
    "framer-motion": "^12.23.24",
    "frimousse": "^0.3.0",
    "get-windows": "^9.2.3",
    "hono": "^4.10.7",
    "idb": "^8.0.3",
    "jose": "^6.1.2",
    "js-sha256": "^0.11.1",
    "lexical": "^0.38.2",
    "lodash": "^4.17.21",
    "lucide-react": "^0.554.0",
    "motion": "^12.23.24",
    "node-pty": "^1.0.0",
    "open": "^11.0.0",
    "plist": "^3.1.0",
    "radix-ui": "^1.4.3",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-easy-sort": "^1.8.0",
    "react-error-boundary": "^6.0.0",
    "react-resizable-panels": "^3.0.6",
    "react-router-dom": "^7.9.6",
    "react-use-measure": "^2.1.7",
    "run-applescript": "^7.1.0",
    "shiki": "^3.17.0",
    "sonner": "^2.0.7",
    "streamdown": "^1.6.8",
    "strip-ansi": "^7.1.2",
    "tailwind-merge": "^3.4.0",
    "tiny-invariant": "^1.3.3",
    "tw-animate-css": "^1.4.0",
    "use-stick-to-bottom": "^1.1.1",
    "uuid": "^13.0.0",
    "valtio": "^2.2.0",
    "valtio-history": "^1.0.0",
    "valtio-persist": "^2.2.4",
    "vaul": "^1.1.2",
    "ws": "^8.18.3",
    "yoga-layout": "^3.2.1"
  },
  "optionalDependencies": {
    "bufferutil": "^4.0.9",
    "utf-8-validate": "^6.0.5"
  }
}
```