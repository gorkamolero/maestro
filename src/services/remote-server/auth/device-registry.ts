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
