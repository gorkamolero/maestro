// Agent Monitor IPC Handlers
// Handles communication between main and renderer for agent monitoring

import { ipcMain, BrowserWindow } from 'electron';
import { resolve, normalize } from 'path';
import { getAgentMonitorService } from '../services/agent-monitor';
import {
  AGENT_MONITOR_CHANNELS,
  type ConnectRepoRequest,
  type GetSessionsForSpaceRequest,
  type GetActivitiesRequest,
  type GetActivitiesForSpaceRequest,
  type GetRecentActivitiesRequest,
} from '../types/agent-events';

// ============================================
// INPUT VALIDATION HELPERS
// ============================================

function validatePath(path: string): string {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('Invalid path: must be a non-empty string');
  }
  if (path.length > 4096) {
    throw new Error('Invalid path: exceeds maximum length');
  }
  // Normalize and resolve to prevent traversal attacks
  const normalized = normalize(resolve(path));
  if (normalized.includes('\0')) {
    throw new Error('Invalid path: contains null bytes');
  }
  return normalized;
}

function validateSessionId(sessionId: string): string {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('Invalid sessionId: must be a non-empty string');
  }
  // Session IDs should be UUIDs or similar safe identifiers
  if (sessionId.length > 128 || !/^[\w-]+$/.test(sessionId)) {
    throw new Error('Invalid sessionId: contains invalid characters');
  }
  return sessionId;
}

function validateSpaceId(spaceId: string): string {
  if (typeof spaceId !== 'string' || spaceId.length === 0) {
    throw new Error('Invalid spaceId: must be a non-empty string');
  }
  if (spaceId.length > 128 || !/^[\w-]+$/.test(spaceId)) {
    throw new Error('Invalid spaceId: contains invalid characters');
  }
  return spaceId;
}

function validateLimit(limit?: number): number | undefined {
  if (limit === undefined) return undefined;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
    throw new Error('Invalid limit: must be a positive integer');
  }
  // Cap at reasonable maximum to prevent DoS
  return Math.min(limit, 10000);
}

// Track service initialization state
let serviceStartPromise: Promise<void> | null = null;
let isServiceStarted = false;

async function ensureServiceStarted(): Promise<void> {
  if (isServiceStarted) return;
  if (serviceStartPromise) {
    await serviceStartPromise;
    return;
  }
  throw new Error('Agent monitor service not initialized');
}

export function registerAgentMonitorHandlers(getMainWindow: () => BrowserWindow | null) {
  const service = getAgentMonitorService();

  // Start the service when handlers are registered
  const window = getMainWindow();
  if (window) {
    serviceStartPromise = service
      .start(window)
      .then(() => {
        isServiceStarted = true;
        console.log('[AgentMonitorIPC] Service started successfully');
      })
      .catch((error) => {
        console.error('[AgentMonitorIPC] Failed to start service:', error);
        throw error;
      });
  }

  // ============================================
  // REQUEST HANDLERS
  // ============================================

  ipcMain.handle(AGENT_MONITOR_CHANNELS.CONNECT_REPO, async (_, req: ConnectRepoRequest) => {
    await ensureServiceStarted();
    const validatedPath = validatePath(req.path);
    const validatedSpaceId = validateSpaceId(req.spaceId);
    service.connectRepo(validatedPath, validatedSpaceId, req.options);
    return { success: true };
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.DISCONNECT_REPO, async (_, path: string) => {
    await ensureServiceStarted();
    const validatedPath = validatePath(path);
    service.disconnectRepo(validatedPath);
    return { success: true };
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_SESSIONS, async () => {
    await ensureServiceStarted();
    return service.getSessions();
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_ACTIVE_SESSIONS, async () => {
    await ensureServiceStarted();
    return service.getActiveSessions();
  });

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_SESSIONS_FOR_SPACE,
    async (_, req: GetSessionsForSpaceRequest) => {
      await ensureServiceStarted();
      const validatedSpaceId = validateSpaceId(req.spaceId);
      return service.getSessionsForSpace(validatedSpaceId);
    }
  );

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_ACTIVITIES, async (_, req: GetActivitiesRequest) => {
    await ensureServiceStarted();
    const validatedSessionId = validateSessionId(req.sessionId);
    const validatedLimit = validateLimit(req.limit);
    return service.getActivitiesForSession(validatedSessionId, validatedLimit);
  });

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_ACTIVITIES_FOR_SPACE,
    async (_, req: GetActivitiesForSpaceRequest) => {
      await ensureServiceStarted();
      const validatedSpaceId = validateSpaceId(req.spaceId);
      const validatedLimit = validateLimit(req.limit);
      return service.getActivitiesForSpace(validatedSpaceId, validatedLimit);
    }
  );

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_RECENT_ACTIVITIES,
    async (_, req: GetRecentActivitiesRequest) => {
      await ensureServiceStarted();
      const validatedLimit = validateLimit(req.limit);
      return service.getRecentActivities(validatedLimit);
    }
  );

  // Additional handlers for stats and management

  ipcMain.handle('agent-monitor:get-stats', async () => {
    await ensureServiceStarted();
    return service.getStats();
  });

  ipcMain.handle('agent-monitor:get-connected-repos', async () => {
    await ensureServiceStarted();
    return service.getConnectedRepos();
  });

  ipcMain.handle('agent-monitor:get-session', async (_, { sessionId }: { sessionId: string }) => {
    await ensureServiceStarted();
    const validatedSessionId = validateSessionId(sessionId);
    return service.getSession(validatedSessionId);
  });
}

export function cleanupAgentMonitorHandlers(): void {
  // Remove all handlers
  for (const channel of Object.values(AGENT_MONITOR_CHANNELS)) {
    ipcMain.removeHandler(channel);
  }

  // Remove additional handlers
  ipcMain.removeHandler('agent-monitor:get-stats');
  ipcMain.removeHandler('agent-monitor:get-connected-repos');
  ipcMain.removeHandler('agent-monitor:get-session');

  // Reset initialization state
  serviceStartPromise = null;
  isServiceStarted = false;

  // Stop the service
  const service = getAgentMonitorService();
  service.stop().catch((error) => {
    console.error('[AgentMonitorIPC] Failed to stop service:', error);
  });
}
