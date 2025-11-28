import { Hono } from 'hono';
import { app } from 'electron';
import os from 'os';
import { wsManager } from '../websocket/handler';
import { listDevices } from '../auth/device-registry';

export const systemRouter = new Hono();

// Health check (public)
systemRouter.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    version: app.getVersion(),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Server stats (authenticated)
systemRouter.get('/stats', (c) => {
  const mem = process.memoryUsage();
  
  return c.json({
    uptime: process.uptime(),
    memory: {
      used: mem.heapUsed,
      total: mem.heapTotal,
    },
    connections: wsManager.getClientCount(),
    hostname: os.hostname(),
  });
});

// List paired devices (authenticated)
systemRouter.get('/devices', (c) => {
  const devices = listDevices().map(d => ({
    deviceId: d.deviceId,
    name: d.name,
    platform: d.platform,
    createdAt: d.createdAt,
    lastSeen: d.lastSeen,
  }));
  
  return c.json({ devices });
});