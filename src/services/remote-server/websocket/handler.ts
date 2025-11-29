import { WebSocket } from 'ws';
import crypto from 'crypto';
import { BrowserWindow, BrowserView, ipcMain } from 'electron';
import { verifyAccessToken } from '../auth/token';
import { getDevice, updateLastSeen } from '../auth/device-registry';
import { envelope, WSEnvelope } from './protocol';
import { terminalBridge } from '../terminal/bridge';
import { injectInputIntoBrowser } from '../../../ipc/remote-view';
import { requestCreateTab } from '../../../ipc/space-sync';
import {
  createShadowWindow,
  closeShadowWindowsForClient,
  getShadowWindowByClient,
  getShadowWindowCaptureSource,
  injectInputIntoShadow,
} from '../../../ipc/shadow-browser';
import type { RemoteInput, ViewportInfo } from '../../../renderer/remote-view/types';

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
  private getMainWindow: (() => BrowserWindow | null) | null = null;
  private getBrowserViewsMap: (() => Map<string, { view: BrowserView; label: string }>) | null = null;
  
  constructor() {
    // Keepalive: ping every 30s
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

        // =====================================================================
        // Shadow Browser handlers (open URL from mobile)
        // =====================================================================

        case 'shadow-browser:open':
          this.handleShadowBrowserOpen(clientId, msg.payload);
          break;

        case 'shadow-browser:input':
          this.handleShadowBrowserInput(clientId, msg.payload);
          break;

        case 'shadow-browser:close':
          this.handleShadowBrowserClose(clientId);
          break;

        // =====================================================================
        // Space/Tab handlers
        // =====================================================================

        case 'space:addTab':
          this.handleAddTab(msg.payload);
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
        // Skip views that can't be accessed
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

    // Get browser info
    const viewsMap = this.getBrowserViewsMap();
    const viewInfo = viewsMap.get(browserId);

    if (!viewInfo) {
      this.send(clientId, 'remote-view:error', { error: 'Browser not found', code: 'NOT_FOUND' });
      return;
    }

    const bounds = viewInfo.view.getBounds();

    // Notify renderer to start capture and create peer for this client
    // Renderer will use browserId to get the media source ID directly from the BrowserView's webContents
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

  // ===========================================================================
  // Shadow Browser Handlers
  // ===========================================================================

  private async handleShadowBrowserOpen(
    clientId: string,
    payload: { url: string; spaceId: string; partition?: string; quality?: string }
  ) {
    const mainWindow = this.getMainWindow?.();
    if (!mainWindow) {
      this.send(clientId, 'shadow-browser:error', { error: 'Desktop not available', code: 'NOT_FOUND' });
      return;
    }

    const { url, spaceId, partition, quality = 'medium' } = payload;

    // Close any existing shadow window for this client
    closeShadowWindowsForClient(clientId);

    // Create shadow window
    const shadow = createShadowWindow({
      clientId,
      url,
      spaceId,
      partition,
      width: quality === 'high' ? 1920 : quality === 'medium' ? 1280 : 854,
      height: quality === 'high' ? 1080 : quality === 'medium' ? 720 : 480,
    });

    // Wait for the page to finish loading before getting capture source
    await new Promise<void>((resolve) => {
      const webContents = shadow.window.webContents;

      // Check if already done loading
      if (!webContents.isLoading()) {
        // Give it a moment for initial render
        setTimeout(resolve, 500);
        return;
      }

      // Wait for did-finish-load event
      const onLoad = () => {
        webContents.removeListener('did-finish-load', onLoad);
        // Give it a moment for initial render
        setTimeout(resolve, 500);
      };

      webContents.on('did-finish-load', onLoad);

      // Timeout fallback after 5 seconds
      setTimeout(() => {
        webContents.removeListener('did-finish-load', onLoad);
        resolve();
      }, 5000);
    });

    // Get capture source
    const source = await getShadowWindowCaptureSource(shadow.id);

    if (!source) {
      this.send(clientId, 'shadow-browser:error', { error: 'Failed to get capture source', code: 'CAPTURE_FAILED' });
      return;
    }

    // Notify renderer to start capture with the ACTUAL source ID (not shadow.id)
    // This avoids a redundant source lookup in the renderer
    mainWindow.webContents.send('remote-view:viewer-connected', clientId, shadow.id, quality, source.id);

    // Confirm to mobile
    this.send(clientId, 'shadow-browser:opened', {
      shadowId: shadow.id,
      url,
      bounds: { width: shadow.window.getBounds().width, height: shadow.window.getBounds().height },
      sourceId: source.id,
    });
  }

  private handleShadowBrowserInput(
    clientId: string,
    payload: { input: RemoteInput; viewport: ViewportInfo }
  ) {
    const shadow = getShadowWindowByClient(clientId);
    if (!shadow) {
      return;
    }

    const { input } = payload;
    injectInputIntoShadow(shadow.id, input);
  }

  private handleShadowBrowserClose(clientId: string) {
    closeShadowWindowsForClient(clientId);

    const mainWindow = this.getMainWindow?.();
    if (mainWindow) {
      mainWindow.webContents.send('remote-view:viewer-disconnected', clientId);
    }

    this.send(clientId, 'shadow-browser:closed', {});
  }

  // ===========================================================================
  // Space/Tab Handlers
  // ===========================================================================

  private handleAddTab(payload: { spaceId: string; tabType: string; url?: string }) {
    const { spaceId, tabType, url } = payload;
    requestCreateTab(spaceId, tabType, url);
  }

  private handleClose(clientId: string) {
    // Clean up any shadow windows for this client
    closeShadowWindowsForClient(clientId);
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
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const msg = JSON.stringify(envelope(type, payload));
    client.ws.send(msg);
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