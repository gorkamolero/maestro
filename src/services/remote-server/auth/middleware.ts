import { Context, Next } from 'hono';
import { getDevice, updateLastSeen } from './device-registry';
import { verifyAccessToken } from './token';

// Dev mode auth bypass requires EXPLICIT opt-in via environment variable
// This prevents accidental auth bypass in production
const allowDevBypass =
  process.env.MAESTRO_DEV_AUTH_BYPASS === 'true' &&
  process.env.NODE_ENV === 'development';

if (allowDevBypass) {
  console.warn('⚠️  [Remote Server] Auth bypass enabled - development only');
}

export async function authMiddleware(c: Context, next: Next) {
  // CSRF protection: Require custom header that browsers won't send cross-origin
  // This prevents malicious sites from making requests to localhost:7777
  const clientHeader = c.req.header('X-Maestro-Client');
  if (clientHeader !== 'mobile') {
    return c.json({ error: 'invalid_client' }, 403);
  }

  // Skip auth in dev mode ONLY if explicitly enabled
  if (allowDevBypass) {
    c.set('deviceId', 'dev-device');
    await next();
    return;
  }

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
