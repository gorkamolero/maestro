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
