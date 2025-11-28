// Agent Monitor IPC Handlers
// Handles communication between main and renderer for agent monitoring

import { ipcMain, BrowserWindow } from 'electron';
import { getAgentMonitorService } from '../services/agent-monitor';
import {
  AGENT_MONITOR_CHANNELS,
  type ConnectRepoRequest,
  type GetSessionsForSpaceRequest,
  type GetActivitiesRequest,
  type GetActivitiesForSpaceRequest,
  type GetRecentActivitiesRequest,
} from '../types/agent-events';

export function registerAgentMonitorHandlers(getMainWindow: () => BrowserWindow | null) {
  const service = getAgentMonitorService();

  // Start the service when handlers are registered
  const window = getMainWindow();
  if (window) {
    service.start(window).catch((error) => {
      console.error('[AgentMonitorIPC] Failed to start service:', error);
    });
  }

  // ============================================
  // REQUEST HANDLERS
  // ============================================

  ipcMain.handle(AGENT_MONITOR_CHANNELS.CONNECT_REPO, async (_, req: ConnectRepoRequest) => {
    service.connectRepo(req.path, req.spaceId, req.options);
    return { success: true };
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.DISCONNECT_REPO, async (_, path: string) => {
    service.disconnectRepo(path);
    return { success: true };
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_SESSIONS, async () => {
    return service.getSessions();
  });

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_ACTIVE_SESSIONS, async () => {
    return service.getActiveSessions();
  });

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_SESSIONS_FOR_SPACE,
    async (_, req: GetSessionsForSpaceRequest) => {
      return service.getSessionsForSpace(req.spaceId);
    }
  );

  ipcMain.handle(AGENT_MONITOR_CHANNELS.GET_ACTIVITIES, async (_, req: GetActivitiesRequest) => {
    return service.getActivitiesForSession(req.sessionId, req.limit);
  });

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_ACTIVITIES_FOR_SPACE,
    async (_, req: GetActivitiesForSpaceRequest) => {
      return service.getActivitiesForSpace(req.spaceId, req.limit);
    }
  );

  ipcMain.handle(
    AGENT_MONITOR_CHANNELS.GET_RECENT_ACTIVITIES,
    async (_, req: GetRecentActivitiesRequest) => {
      return service.getRecentActivities(req.limit);
    }
  );

  // Additional handlers for stats and management

  ipcMain.handle('agent-monitor:get-stats', async () => {
    return service.getStats();
  });

  ipcMain.handle('agent-monitor:get-connected-repos', async () => {
    return service.getConnectedRepos();
  });

  ipcMain.handle('agent-monitor:get-session', async (_, { sessionId }: { sessionId: string }) => {
    return service.getSession(sessionId);
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

  // Stop the service
  const service = getAgentMonitorService();
  service.stop().catch((error) => {
    console.error('[AgentMonitorIPC] Failed to stop service:', error);
  });
}
