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