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
  expiresInSeconds = 900  // 15 minutes
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
