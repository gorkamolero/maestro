import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';
import os from 'os';
import { app as electronApp } from 'electron'; // Alias 'app' to 'electronApp' to avoid conflict with hono 'app'
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs/promises';

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
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowHeaders: ['Content-Type', 'Authorization'],
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
      ? path.join(process.resourcesPath, 'app.asar/dist/mobile') // In packaged app, it's inside app.asar
      : path.join(__dirname, '../../../../dist/mobile');

    // Static assets
    this.app.use('/assets/*', serveStatic({ root: mobilePath, stripEmptyParams: true }));
    
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
    
    (this.server as any).on('upgrade', (request: any, socket: any, head: any) => {
      const url = new URL(request.url, `http://localhost:${this.port}`);
      
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
      
      this.wss!.handleUpgrade(request, socket, head, (ws) => {
        wsManager.handleUpgrade(ws as any, token);
      });
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
