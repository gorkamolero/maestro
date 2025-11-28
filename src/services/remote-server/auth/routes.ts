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
