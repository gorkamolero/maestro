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
  } catch {
    // ignore
  }
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
