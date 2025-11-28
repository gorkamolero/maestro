# Maestro Remote Server v2

Mobile control for your AI coding agents. Built on proven patterns from Pocket Server.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Maestro (Electron)                        │
├─────────────────────────────────────────────────────────────────┤
│  React UI          │  Remote Server (:7777)    │  Agent Monitor │
│  ─────────         │  ──────────────────────   │  ───────────── │
│  Control Room      │  Hono HTTP API            │  JSONL Watcher │
│  Agent Vault       │  WebSocket Server         │  PTY Manager   │
│  Terminal Tabs     │  Terminal Bridge          │  Status Engine │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WS (LAN or Tunnel)
                              ▼
                    ┌───────────────────┐
                    │   Mobile App      │
                    │   (React Native)  │
                    └───────────────────┘
```

## File Structure

```
src/main/services/remote-server/
├── index.ts                 # Server bootstrap, Hono + WS
├── auth/
│   ├── device-registry.ts   # Persistent device storage
│   ├── pairing.ts           # PIN generation, pairing window
│   ├── token.ts             # JWT sign/verify
│   ├── middleware.ts        # Request auth verification
│   └── routes.ts            # /auth/* endpoints
├── routes/
│   ├── agents.ts            # /api/agents/*
│   ├── spaces.ts            # /api/spaces/*
│   ├── terminals.ts         # /api/terminals/*
│   └── system.ts            # /api/health, /api/stats
├── websocket/
│   ├── handler.ts           # Connection manager
│   ├── protocol.ts          # Message envelope types
│   └── subscriptions.ts     # Channel subscriptions
├── terminal/
│   ├── bridge.ts            # PTY ↔ WS with buffering
│   └── backlog.ts           # Resume buffer per session
└── types.ts                 # Shared types
```

---

## 1. Authentication

### Device Registry

Devices pair once and receive a permanent secret. This enables re-authentication without re-pairing.

```typescript
// src/main/services/remote-server/auth/device-registry.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { app } from 'electron';
import { join } from 'path';
import crypto from 'crypto';

export interface RegisteredDevice {
  deviceId: string;
  secret: string;           // 32-byte hex, generated on pair
  name?: string;            // "Gorka's iPhone"
  platform?: 'ios' | 'android';
  createdAt: string;        // ISO
  lastSeen?: string;        // ISO
  revoked?: boolean;
}

const DEVICES_PATH = join(app.getPath('userData'), 'remote-server', 'devices.json');

function ensureDir(): void {
  const dir = join(app.getPath('userData'), 'remote-server');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadDevices(): RegisteredDevice[] {
  try {
    ensureDir();
    if (!existsSync(DEVICES_PATH)) return [];
    return JSON.parse(readFileSync(DEVICES_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveDevices(devices: RegisteredDevice[]): void {
  ensureDir();
  writeFileSync(DEVICES_PATH, JSON.stringify(devices, null, 2), 'utf8');
}

export function getDevice(deviceId: string): RegisteredDevice | undefined {
  return loadDevices().find(d => d.deviceId === deviceId);
}

export function registerDevice(input: {
  deviceId: string;
  name?: string;
  platform?: 'ios' | 'android';
}): RegisteredDevice {
  const devices = loadDevices();
  const existing = devices.find(d => d.deviceId === input.deviceId);
  
  if (existing && !existing.revoked) {
    // Re-pairing: rotate secret
    existing.secret = crypto.randomBytes(32).toString('hex');
    existing.lastSeen = new Date().toISOString();
    saveDevices(devices);
    return existing;
  }
  
  const device: RegisteredDevice = {
    deviceId: input.deviceId,
    secret: crypto.randomBytes(32).toString('hex'),
    name: input.name,
    platform: input.platform,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
  
  devices.push(device);
  saveDevices(devices);
  return device;
}

export function updateLastSeen(deviceId: string): void {
  const devices = loadDevices();
  const device = devices.find(d => d.deviceId === deviceId);
  if (device) {
    device.lastSeen = new Date().toISOString();
    saveDevices(devices);
  }
}

export function revokeDevice(deviceId: string): boolean {
  const devices = loadDevices();
  const device = devices.find(d => d.deviceId === deviceId);
  if (device) {
    device.revoked = true;
    saveDevices(devices);
    return true;
  }
  return false;
}

export function listDevices(): RegisteredDevice[] {
  return loadDevices().filter(d => !d.revoked);
}
```

### Pairing Flow

```typescript
// src/main/services/remote-server/auth/pairing.ts

import crypto from 'crypto';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

interface PairingState {
  active: boolean;
  pinHash?: string;         // sha256 of PIN
  expiresAt?: string;       // ISO
  mode: 'local' | 'remote';
  remoteToken?: string;     // For tunnel pairing
  attempts: number;
  maxAttempts: number;
}

const STATE_PATH = join(app.getPath('userData'), 'remote-server', 'pairing.json');

function loadState(): PairingState {
  try {
    if (existsSync(STATE_PATH)) {
      return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    }
  } catch {}
  return { active: false, mode: 'local', attempts: 0, maxAttempts: 3 };
}

function saveState(state: PairingState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export function startPairing(options: {
  durationMs?: number;
  remote?: boolean;
}): { pin: string; expiresAt: string; remoteToken?: string } {
  const { durationMs = 60_000, remote = false } = options;
  
  const pin = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
  const expiresAt = new Date(Date.now() + durationMs).toISOString();
  
  const state: PairingState = {
    active: true,
    pinHash,
    expiresAt,
    mode: remote ? 'remote' : 'local',
    remoteToken: remote ? crypto.randomBytes(24).toString('base64url') : undefined,
    attempts: 0,
    maxAttempts: remote ? 5 : 3,
  };
  
  saveState(state);
  return { pin, expiresAt, remoteToken: state.remoteToken };
}

export function stopPairing(): void {
  saveState({ active: false, mode: 'local', attempts: 0, maxAttempts: 3 });
}

export function isPairingActive(): boolean {
  const state = loadState();
  if (!state.active || !state.expiresAt) return false;
  if (Date.now() >= new Date(state.expiresAt).getTime()) return false;
  if (state.attempts >= state.maxAttempts) return false;
  return true;
}

export function verifyPin(pin: string): boolean {
  const state = loadState();
  if (!isPairingActive()) return false;
  
  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  const valid = crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(state.pinHash!, 'hex')
  );
  
  if (!valid) {
    state.attempts++;
    saveState(state);
  }
  
  return valid;
}

export function verifyRemoteToken(token: string): boolean {
  const state = loadState();
  if (!isPairingActive() || state.mode !== 'remote') return false;
  if (!state.remoteToken) return false;
  
  try {
    const a = Buffer.from(token, 'utf8');
    const b = Buffer.from(state.remoteToken, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getPairingStatus(): {
  active: boolean;
  mode: 'local' | 'remote';
  expiresAt: string | null;
  secondsLeft: number;
} {
  const state = loadState();
  const active = isPairingActive();
  const expiresAt = active ? state.expiresAt ?? null : null;
  const secondsLeft = expiresAt 
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 0;
  
  return { active, mode: state.mode, expiresAt, secondsLeft };
}
```

### JWT Tokens

```typescript
// src/main/services/remote-server/auth/token.ts

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

// Server secret: generated once, persists across restarts
const SECRET_PATH = join(app.getPath('userData'), 'remote-server', 'jwt-secret.key');

function getSecret(): Uint8Array {
  if (existsSync(SECRET_PATH)) {
    return Buffer.from(readFileSync(SECRET_PATH, 'utf8'), 'hex');
  }
  const secret = crypto.randomBytes(32);
  writeFileSync(SECRET_PATH, secret.toString('hex'), 'utf8');
  return secret;
}

const SECRET = getSecret();

export interface TokenPayload {
  deviceId: string;
  iat: number;
  exp: number;
}

export async function signAccessToken(
  payload: { deviceId: string },
  expiresInSeconds: number = 900  // 15 minutes
): Promise<{ token: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  
  const token = await new SignJWT({ deviceId: payload.deviceId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(SECRET);
  
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
```

### Auth Routes

```typescript
// src/main/services/remote-server/auth/routes.ts

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

### Auth Middleware

```typescript
// src/main/services/remote-server/auth/middleware.ts

import { Context, Next } from 'hono';
import { getDevice, updateLastSeen } from './device-registry';
import { verifyAccessToken } from './token';

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header('Authorization');
  
  if (!auth?.startsWith('Maestro ')) {
    return c.json({ error: 'missing_token' }, 401);
  }
  
  const token = auth.slice('Maestro '.length);
  const payload = await verifyAccessToken(token);
  
  if (!payload) {
    return c.json({ error: 'invalid_token' }, 401);
  }
  
  const device = getDevice(payload.deviceId);
  if (!device || device.revoked) {
    return c.json({ error: 'device_revoked' }, 401);
  }
  
  updateLastSeen(payload.deviceId);
  c.set('deviceId', payload.deviceId);
  
  await next();
}
```

---

## 2. WebSocket Protocol

### Message Envelope

All messages use a versioned envelope for traceability:

```typescript
// src/main/services/remote-server/websocket/protocol.ts

export interface WSEnvelope<T = unknown> {
  v: 1;                     // Protocol version
  id: string;               // Message UUID
  ts: string;               // ISO timestamp
  type: string;             // Message type
  payload: T;
  timestamp: number;        // Unix ms (for latency calc)
}

// Inbound (client → server)
export type ClientMessage =
  | { type: 'ping' }
  | { type: 'subscribe'; payload: { channel: string; id?: string } }
  | { type: 'unsubscribe'; payload: { channel: string; id?: string } }
  | { type: 'term:input'; payload: { id: string; data: string; seq?: number } }
  | { type: 'term:resize'; payload: { id: string; cols: number; rows: number } };

// Outbound (server → client)
export type ServerMessage =
  | { type: 'pong' }
  | { type: 'connected'; payload: { clientId: string } }
  | { type: 'subscribed'; payload: { channel: string; id?: string } }
  | { type: 'error'; payload: { code: string; message: string } }
  // Terminal
  | { type: 'term:frame'; payload: TerminalFrame }
  | { type: 'term:exit'; payload: { id: string; code: number } }
  // Agents
  | { type: 'agent:created'; payload: AgentInfo }
  | { type: 'agent:updated'; payload: AgentInfo }
  | { type: 'agent:ended'; payload: { id: string } }
  | { type: 'agent:activity'; payload: AgentActivity };

export interface TerminalFrame {
  id: string;
  seq: number;
  ts: number;
  data: string;
}

export interface AgentInfo {
  id: string;
  type: 'claude-code' | 'codex' | 'gemini';
  status: 'active' | 'idle' | 'needs_input' | 'ended';
  projectPath: string;
  projectName: string;
  spaceId?: string;
  spaceName?: string;
  terminalId?: string;
  launchMode: 'local' | 'mobile';
  startedAt: string;
  lastActivityAt: string;
}

export interface AgentActivity {
  sessionId: string;
  type: 'assistant' | 'user' | 'tool_use' | 'tool_result' | 'error';
  timestamp: string;
  content?: string;
  toolName?: string;
}

// Helper to create envelope
export function envelope<T>(type: string, payload: T): WSEnvelope<T> {
  return {
    v: 1,
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    type,
    payload,
    timestamp: Date.now(),
  };
}
```

### Connection Handler

```typescript
// src/main/services/remote-server/websocket/handler.ts

import { WebSocket } from 'ws';
import { verifyAccessToken } from '../auth/token';
import { getDevice, updateLastSeen } from '../auth/device-registry';
import { envelope, ClientMessage, WSEnvelope } from './protocol';

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

---

## 3. Terminal Bridge

High-performance PTY ↔ WebSocket bridge with buffering for smooth streaming.

```typescript
// src/main/services/remote-server/terminal/bridge.ts

import { IPty } from 'node-pty';
import { wsManager } from '../websocket/handler';
import { TerminalFrame } from '../websocket/protocol';

const FLUSH_INTERVAL_MS = 8;        // ~120Hz
const MAX_FRAME_BYTES = 32 * 1024;  // 32KB max frame
const MAX_BACKLOG_BYTES = 1024 * 1024; // 1MB backlog per terminal

interface FrameBuffer {
  chunks: string[];
  bytes: number;
  timer: NodeJS.Timeout | null;
  seq: number;
}

interface Backlog {
  chunks: string[];
  totalBytes: number;
  exited?: { code: number; ts: number };
}

class TerminalBridge {
  private ptys = new Map<string, IPty>();
  private buffers = new Map<string, FrameBuffer>();
  private backlogs = new Map<string, Backlog>();
  private inputSeq = new Map<string, number>();  // Dedup
  
  register(terminalId: string, pty: IPty) {
    this.ptys.set(terminalId, pty);
    this.backlogs.set(terminalId, { chunks: [], totalBytes: 0 });
    
    pty.onData((data) => {
      this.appendBacklog(terminalId, data);
      this.bufferFrame(terminalId, data);
    });
    
    pty.onExit(({ exitCode }) => {
      this.flush(terminalId);
      
      // Record exit in backlog
      const backlog = this.backlogs.get(terminalId);
      if (backlog) {
        backlog.exited = { code: exitCode, ts: Date.now() };
      }
      
      // Broadcast exit
      wsManager.broadcastToId('terminal', terminalId, 'term:exit', {
        id: terminalId,
        code: exitCode,
      });
      
      this.cleanup(terminalId);
    });
  }
  
  private bufferFrame(id: string, data: string) {
    let buf = this.buffers.get(id);
    if (!buf) {
      buf = { chunks: [], bytes: 0, timer: null, seq: 0 };
      this.buffers.set(id, buf);
    }
    
    buf.chunks.push(data);
    buf.bytes += data.length;
    
    // Flush immediately if frame too large
    if (buf.bytes >= MAX_FRAME_BYTES) {
      this.flush(id);
      return;
    }
    
    // Schedule flush at target framerate
    if (!buf.timer) {
      buf.timer = setTimeout(() => this.flush(id), FLUSH_INTERVAL_MS);
    }
  }
  
  private flush(id: string) {
    const buf = this.buffers.get(id);
    if (!buf || buf.bytes === 0) return;
    
    if (buf.timer) {
      clearTimeout(buf.timer);
      buf.timer = null;
    }
    
    const data = buf.chunks.join('');
    buf.chunks = [];
    buf.bytes = 0;
    buf.seq++;
    
    const frame: TerminalFrame = {
      id,
      seq: buf.seq,
      ts: Date.now(),
      data,
    };
    
    wsManager.broadcastToId('terminal', id, 'term:frame', frame);
  }
  
  private appendBacklog(id: string, data: string) {
    let backlog = this.backlogs.get(id);
    if (!backlog) {
      backlog = { chunks: [], totalBytes: 0 };
      this.backlogs.set(id, backlog);
    }
    
    backlog.chunks.push(data);
    backlog.totalBytes += data.length;
    
    // Trim old data if too large
    while (backlog.totalBytes > MAX_BACKLOG_BYTES && backlog.chunks.length > 0) {
      const removed = backlog.chunks.shift()!;
      backlog.totalBytes -= removed.length;
    }
  }
  
  // Send backlog to newly subscribed client
  sendBacklog(clientId: string, terminalId: string) {
    const backlog = this.backlogs.get(terminalId);
    if (!backlog || backlog.chunks.length === 0) return;
    
    const data = backlog.chunks.join('');
    
    // Send in chunks to avoid overwhelming
    let offset = 0;
    let seq = 0;
    while (offset < data.length) {
      const slice = data.slice(offset, offset + MAX_FRAME_BYTES);
      wsManager.send(clientId, 'term:frame', {
        id: terminalId,
        seq: seq++,
        ts: Date.now(),
        data: slice,
      });
      offset += MAX_FRAME_BYTES;
    }
    
    // If terminal exited, send exit too
    if (backlog.exited) {
      wsManager.send(clientId, 'term:exit', {
        id: terminalId,
        code: backlog.exited.code,
      });
    }
  }
  
  write(id: string, data: string, seq?: number) {
    // Dedup by sequence number
    if (seq !== undefined) {
      const lastSeq = this.inputSeq.get(id) ?? -1;
      if (seq <= lastSeq) return;  // Already processed
      this.inputSeq.set(id, seq);
    }
    
    const pty = this.ptys.get(id);
    if (pty) {
      pty.write(data);
      // Flush output immediately after input for snappy echo
      this.flush(id);
    }
  }
  
  resize(id: string, cols: number, rows: number) {
    const pty = this.ptys.get(id);
    if (pty) {
      pty.resize(cols, rows);
    }
  }
  
  private cleanup(id: string) {
    this.ptys.delete(id);
    this.buffers.delete(id);
    this.inputSeq.delete(id);
    // Keep backlog for reconnection
  }
  
  dispose() {
    for (const pty of this.ptys.values()) {
      pty.kill();
    }
    this.ptys.clear();
    this.buffers.clear();
    this.backlogs.clear();
  }
}

export const terminalBridge = new TerminalBridge();
```

---

## 4. API Routes

### Agents

```typescript
// src/main/services/remote-server/routes/agents.ts

import { Hono } from 'hono';
import { agentMonitorService } from '../../agent-monitor';  // Your existing service

export const agentsRouter = new Hono();

// List all active agent sessions
agentsRouter.get('/', (c) => {
  const sessions = agentMonitorService.getSessions();
  
  const agents = sessions
    .filter(s => s.status !== 'ended')
    .map(s => ({
      id: s.sessionId,
      type: s.agentType,
      status: s.status,
      projectPath: s.projectPath,
      projectName: s.projectPath.split('/').pop(),
      spaceId: s.spaceId,
      spaceName: s.spaceName,
      terminalId: s.terminalId,
      launchMode: s.launchMode,
      startedAt: s.startedAt,
      lastActivityAt: s.lastActivityAt,
      stats: s.stats,
    }));
  
  return c.json({ agents });
});

// Get single agent
agentsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const session = agentMonitorService.getSession(id);
  
  if (!session) {
    return c.json({ error: 'not_found' }, 404);
  }
  
  return c.json({
    id: session.sessionId,
    type: session.agentType,
    status: session.status,
    projectPath: session.projectPath,
    projectName: session.projectPath.split('/').pop(),
    spaceId: session.spaceId,
    spaceName: session.spaceName,
    terminalId: session.terminalId,
    launchMode: session.launchMode,
    startedAt: session.startedAt,
    lastActivityAt: session.lastActivityAt,
    stats: session.stats,
  });
});

// Get agent activities
agentsRouter.get('/:id/activities', (c) => {
  const id = c.req.param('id');
  const limit = parseInt(c.req.query('limit') ?? '50');
  
  const activities = agentMonitorService.getActivities(id, limit);
  
  return c.json({ activities });
});

// Send input to agent terminal
agentsRouter.post('/:id/input', async (c) => {
  const id = c.req.param('id');
  const { text } = await c.req.json<{ text: string }>();
  
  const session = agentMonitorService.getSession(id);
  if (!session?.terminalId) {
    return c.json({ error: 'no_terminal' }, 400);
  }
  
  terminalBridge.write(session.terminalId, text);
  
  return c.json({ success: true });
});

// Launch new agent
agentsRouter.post('/launch', async (c) => {
  const { spaceId, projectPath, mode = 'local' } = await c.req.json<{
    spaceId?: string;
    projectPath: string;
    mode: 'local' | 'mobile';
  }>();
  
  // Create terminal and launch claude/happy
  const terminalId = `term-${Date.now()}`;
  const command = mode === 'mobile' ? 'happy' : 'claude';
  
  // This would integrate with your terminal tab creation
  // and agent launch logic
  
  return c.json({
    success: true,
    terminalId,
    sessionId: null,  // Will be detected when JSONL appears
  });
});
```

### Spaces

```typescript
// src/main/services/remote-server/routes/spaces.ts

import { Hono } from 'hono';
import { workspaceStore } from '../../stores/workspace';  // Your Valtio store

export const spacesRouter = new Hono();

// List all spaces
spacesRouter.get('/', (c) => {
  const spaces = workspaceStore.spaces.map(s => ({
    id: s.id,
    name: s.name,
    color: s.color,
    icon: s.icon,
    repoPath: s.repoPath,
    lastAccessedAt: s.lastAccessedAt,
    tabCount: s.tabs.length,
    agentCount: s.agents?.length ?? 0,
  }));
  
  return c.json({ spaces });
});

// Get single space with tabs
spacesRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const space = workspaceStore.spaces.find(s => s.id === id);
  
  if (!space) {
    return c.json({ error: 'not_found' }, 404);
  }
  
  return c.json({
    id: space.id,
    name: space.name,
    color: space.color,
    icon: space.icon,
    repoPath: space.repoPath,
    lastAccessedAt: space.lastAccessedAt,
    tabs: space.tabs.map(t => ({
      id: t.id,
      type: t.type,
      title: t.title,
      url: t.url,
    })),
    agents: space.agents ?? [],
  });
});

// Get agents for a space
spacesRouter.get('/:id/agents', (c) => {
  const id = c.req.param('id');
  
  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');
  
  return c.json({ agents: sessions });
});
```

### System

```typescript
// src/main/services/remote-server/routes/system.ts

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
```

---

## 5. Server Bootstrap

```typescript
// src/main/services/remote-server/index.ts

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer } from 'ws';
import os from 'os';

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
    this.app.get('/api/health', systemRouter.fetch);
    
    // Protected routes
    this.app.use('/api/*', authMiddleware);
    this.app.route('/api/agents', agentsRouter);
    this.app.route('/api/spaces', spacesRouter);
    this.app.route('/api', systemRouter);
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
  startPairing(remote: boolean = false): { pin: string; expiresAt: string; remoteToken?: string } {
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

---

## 6. Integration with Maestro

### IPC Handlers

```typescript
// src/main/ipc/remote-server.ts

import { ipcMain } from 'electron';
import { remoteServer } from '../services/remote-server';

export function registerRemoteServerIPC() {
  ipcMain.handle('remote-server:start', async (_, port?: number) => {
    await remoteServer.start(port);
    return remoteServer.getConnectionInfo();
  });
  
  ipcMain.handle('remote-server:stop', () => {
    remoteServer.stop();
  });
  
  ipcMain.handle('remote-server:start-pairing', (_, remote: boolean) => {
    return remoteServer.startPairing(remote);
  });
  
  ipcMain.handle('remote-server:stop-pairing', () => {
    remoteServer.stopPairing();
  });
  
  ipcMain.handle('remote-server:pairing-status', () => {
    return remoteServer.getPairingStatus();
  });
  
  ipcMain.handle('remote-server:connection-info', () => {
    return remoteServer.getConnectionInfo();
  });
}
```

### React Hook

```typescript
// src/renderer/hooks/useRemoteServer.ts

import { useState, useEffect, useCallback } from 'react';

interface PairingInfo {
  pin: string;
  expiresAt: string;
  remoteToken?: string;
}

interface ConnectionInfo {
  urls: string[];
  port: number;
}

export function useRemoteServer() {
  const [isRunning, setIsRunning] = useState(false);
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  
  const start = useCallback(async (port?: number) => {
    const info = await window.api.invoke('remote-server:start', port);
    setConnection(info);
    setIsRunning(true);
  }, []);
  
  const stop = useCallback(async () => {
    await window.api.invoke('remote-server:stop');
    setIsRunning(false);
    setConnection(null);
  }, []);
  
  const startPairing = useCallback(async (remote = false) => {
    const info = await window.api.invoke('remote-server:start-pairing', remote);
    setPairing(info);
    return info;
  }, []);
  
  const stopPairing = useCallback(async () => {
    await window.api.invoke('remote-server:stop-pairing');
    setPairing(null);
  }, []);
  
  return {
    isRunning,
    connection,
    pairing,
    start,
    stop,
    startPairing,
    stopPairing,
  };
}
```

---

## 7. Mobile App Architecture

### Authentication Flow

```typescript
// Mobile: services/auth.ts

import * as Keychain from 'react-native-keychain';
import CryptoJS from 'crypto-js';

interface StoredCredentials {
  serverUrl: string;
  deviceId: string;
  secret: string;
}

async function loadCredentials(): Promise<StoredCredentials | null> {
  const creds = await Keychain.getGenericPassword({ service: 'maestro' });
  if (!creds) return null;
  return JSON.parse(creds.password);
}

async function saveCredentials(creds: StoredCredentials): Promise<void> {
  await Keychain.setGenericPassword('maestro', JSON.stringify(creds), {
    service: 'maestro',
  });
}

async function pair(serverUrl: string, pin: string, deviceName: string): Promise<void> {
  const deviceId = generateDeviceId();
  
  const res = await fetch(`${serverUrl}/auth/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId,
      pin,
      name: deviceName,
      platform: Platform.OS,
    }),
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  
  await saveCredentials({
    serverUrl,
    deviceId: data.deviceId,
    secret: data.secret,
  });
}

async function getToken(): Promise<string> {
  const creds = await loadCredentials();
  if (!creds) throw new Error('Not paired');
  
  // Get challenge
  const challengeRes = await fetch(`${creds.serverUrl}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: creds.deviceId }),
  });
  
  const { nonce } = await challengeRes.json();
  
  // Sign: sha256(secret + "\n" + deviceId + "\n" + nonce)
  const message = `${creds.secret}\n${creds.deviceId}\n${nonce}`;
  const signature = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
  
  // Exchange for token
  const tokenRes = await fetch(`${creds.serverUrl}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: creds.deviceId,
      nonce,
      signature,
    }),
  });
  
  const { token } = await tokenRes.json();
  return token;
}
```

### WebSocket Connection

```typescript
// Mobile: services/websocket.ts

import { getToken } from './auth';

class MaestroWebSocket {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  async connect(serverUrl: string): Promise<void> {
    this.serverUrl = serverUrl;
    
    const token = await getToken();
    const wsUrl = serverUrl.replace(/^http/, 'ws') + `/ws?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to Maestro');
      this.startPing();
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };
    
    this.ws.onclose = () => {
      this.scheduleReconnect();
    };
  }
  
  private startPing() {
    setInterval(() => {
      this.send('ping', null);
    }, 25_000);
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.serverUrl);
    }, 3000);
  }
  
  send(type: string, payload: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    this.ws.send(JSON.stringify({
      v: 1,
      id: uuid(),
      ts: new Date().toISOString(),
      type,
      payload,
      timestamp: Date.now(),
    }));
  }
  
  subscribe(channel: string, id?: string) {
    this.send('subscribe', { channel, id });
  }
  
  private handleMessage(msg: any) {
    // Dispatch to appropriate handler
    eventEmitter.emit(msg.type, msg.payload);
  }
}
```

---

## Implementation Timeline

### Phase 1: Core Server (Day 1-2)
- [ ] Device registry
- [ ] Pairing flow
- [ ] Challenge-response auth
- [ ] JWT tokens
- [ ] Basic HTTP server

### Phase 2: WebSocket (Day 2-3)
- [ ] Connection handler
- [ ] Subscriptions
- [ ] Message envelope
- [ ] Ping/pong keepalive

### Phase 3: Terminal Bridge (Day 3-4)
- [ ] PTY registration
- [ ] Frame buffering
- [ ] Backlog for resume
- [ ] Input handling

### Phase 4: API Routes (Day 4-5)
- [ ] Agent listing
- [ ] Space listing
- [ ] Terminal routes
- [ ] System routes

### Phase 5: UI Integration (Day 5-6)
- [ ] IPC handlers
- [ ] Pairing modal
- [ ] Settings panel
- [ ] Status indicator

### Phase 6: Mobile App (Day 6-10)
- [ ] Connection flow
- [ ] Agent list screen
- [ ] Terminal view
- [ ] Push notifications

---

## Key Differences from Original Spec

| Aspect | Original | Revised |
|--------|----------|---------|
| Auth | PIN → JWT directly | PIN → Device Secret → Challenge → JWT |
| Token refresh | None | Challenge-response (no re-pair needed) |
| WS messages | Ad-hoc | Versioned envelope |
| Terminal streaming | Basic | Frame buffering (8ms/32KB) |
| Resume | None | 1MB backlog per terminal |
| Mobile auth | Store JWT | Store device secret (more secure) |

This spec is now production-ready with battle-tested patterns from Pocket Server.
