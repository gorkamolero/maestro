// Agent Monitor Store
// Valtio store for tracking external AI coding agents in the renderer

import { proxy, useSnapshot } from 'valtio';
import type {
  AgentSession,
  AgentActivity,
  ConnectedRepo,
} from '@/types/agent-events';

// ============================================
// STATE
// ============================================

interface AgentMonitorState {
  // Sessions indexed by ID
  sessions: Record<string, AgentSession>;

  // Recent activities (global ring buffer)
  recentActivities: AgentActivity[];

  // Activities by session (loaded on demand)
  sessionActivities: Record<string, AgentActivity[]>;

  // Connected repos by space
  connectedRepos: Record<string, string>; // spaceId -> repoPath

  // UI state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const MAX_RECENT_ACTIVITIES = 500;

export const agentMonitorStore = proxy<AgentMonitorState>({
  sessions: {},
  recentActivities: [],
  sessionActivities: {},
  connectedRepos: {},
  isLoading: false,
  isInitialized: false,
  error: null,
});

// ============================================
// HOOK
// ============================================

export function useAgentMonitorStore() {
  return useSnapshot(agentMonitorStore);
}

// ============================================
// DERIVED STATE HELPERS
// ============================================

export function getActiveSessions(): AgentSession[] {
  return Object.values(agentMonitorStore.sessions)
    .filter((s) => s.status !== 'ended')
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

export function getSessionsForSpace(spaceId: string): AgentSession[] {
  const repoPath = agentMonitorStore.connectedRepos[spaceId];
  if (!repoPath) return [];

  return Object.values(agentMonitorStore.sessions)
    .filter((s) => s.projectPath === repoPath || s.projectPath.startsWith(repoPath + '/'))
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

export function getActivitiesForSpace(spaceId: string, limit = 50): AgentActivity[] {
  const sessions = getSessionsForSpace(spaceId);
  const sessionIds = new Set(sessions.map((s) => s.id));

  return agentMonitorStore.recentActivities
    .filter((a) => sessionIds.has(a.sessionId))
    .slice(-limit);
}

export function getSessionById(sessionId: string): AgentSession | undefined {
  return agentMonitorStore.sessions[sessionId];
}

export function getSessionActivities(sessionId: string): AgentActivity[] {
  return agentMonitorStore.sessionActivities[sessionId] || [];
}

// ============================================
// ACTIONS
// ============================================

export const agentMonitorActions = {
  // Initialize - subscribe to IPC events
  async initialize(): Promise<void> {
    if (agentMonitorStore.isInitialized) {
      return;
    }

    if (typeof window === 'undefined' || !window.agentMonitor) {
      console.warn('[AgentMonitorStore] agentMonitor API not available');
      return;
    }

    // Subscribe to real-time events
    window.agentMonitor.onSessionCreated((session) => {
      agentMonitorStore.sessions[session.id] = session;
    });

    window.agentMonitor.onSessionUpdated((session) => {
      agentMonitorStore.sessions[session.id] = session;
    });

    window.agentMonitor.onSessionEnded((session) => {
      agentMonitorStore.sessions[session.id] = session;
    });

    window.agentMonitor.onActivityNew((activity) => {
      // Add to recent activities
      agentMonitorStore.recentActivities.push(activity);

      // Trim if over limit
      if (agentMonitorStore.recentActivities.length > MAX_RECENT_ACTIVITIES) {
        agentMonitorStore.recentActivities = agentMonitorStore.recentActivities.slice(
          -MAX_RECENT_ACTIVITIES
        );
      }

      // Add to session-specific activities if loaded
      if (agentMonitorStore.sessionActivities[activity.sessionId]) {
        agentMonitorStore.sessionActivities[activity.sessionId].push(activity);
      }
    });

    // Load initial data
    await this.refresh();
    agentMonitorStore.isInitialized = true;
  },

  async refresh(): Promise<void> {
    if (!window.agentMonitor) return;

    agentMonitorStore.isLoading = true;
    agentMonitorStore.error = null;

    try {
      const [sessions, activities, connectedRepos] = await Promise.all([
        window.agentMonitor.getSessions(),
        window.agentMonitor.getRecentActivities({ limit: 200 }),
        window.agentMonitor.getConnectedRepos(),
      ]);

      // Index sessions
      agentMonitorStore.sessions = {};
      for (const session of sessions) {
        agentMonitorStore.sessions[session.id] = session;
      }

      agentMonitorStore.recentActivities = activities;

      // Index connected repos by spaceId
      agentMonitorStore.connectedRepos = {};
      for (const repo of connectedRepos) {
        agentMonitorStore.connectedRepos[repo.spaceId] = repo.absolutePath;
      }
    } catch (error) {
      agentMonitorStore.error = (error as Error).message;
      console.error('[AgentMonitorStore] Refresh error:', error);
    } finally {
      agentMonitorStore.isLoading = false;
    }
  },

  async connectRepo(spaceId: string, repoPath: string): Promise<void> {
    if (!window.agentMonitor) return;

    try {
      await window.agentMonitor.connectRepo({
        path: repoPath,
        spaceId,
        options: {
          monitoringEnabled: true,
          autoCreateSegments: true,
        },
      });

      agentMonitorStore.connectedRepos[spaceId] = repoPath;
    } catch (error) {
      agentMonitorStore.error = (error as Error).message;
      console.error('[AgentMonitorStore] Connect repo error:', error);
    }
  },

  async disconnectRepo(spaceId: string): Promise<void> {
    if (!window.agentMonitor) return;

    const repoPath = agentMonitorStore.connectedRepos[spaceId];
    if (!repoPath) return;

    try {
      await window.agentMonitor.disconnectRepo(repoPath);
      delete agentMonitorStore.connectedRepos[spaceId];
    } catch (error) {
      agentMonitorStore.error = (error as Error).message;
      console.error('[AgentMonitorStore] Disconnect repo error:', error);
    }
  },

  async loadSessionActivities(sessionId: string): Promise<void> {
    if (!window.agentMonitor) return;

    try {
      const activities = await window.agentMonitor.getActivities({
        sessionId,
        limit: 100,
      });

      agentMonitorStore.sessionActivities[sessionId] = activities;
    } catch (error) {
      agentMonitorStore.error = (error as Error).message;
      console.error('[AgentMonitorStore] Load session activities error:', error);
    }
  },

  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalActivities: number;
    connectedRepos: number;
  } | null> {
    if (!window.agentMonitor) return null;

    try {
      return await window.agentMonitor.getStats();
    } catch (error) {
      console.error('[AgentMonitorStore] Get stats error:', error);
      return null;
    }
  },

  clearError(): void {
    agentMonitorStore.error = null;
  },
};

// ============================================
// TYPE AUGMENTATION FOR WINDOW
// ============================================

declare global {
  interface Window {
    agentMonitor: {
      // Commands
      connectRepo: (req: {
        path: string;
        spaceId: string;
        options?: {
          monitoringEnabled?: boolean;
          autoCreateSegments?: boolean;
        };
      }) => Promise<{ success: boolean }>;
      disconnectRepo: (path: string) => Promise<{ success: boolean }>;

      // Queries
      getSessions: () => Promise<AgentSession[]>;
      getActiveSessions: () => Promise<AgentSession[]>;
      getSessionsForSpace: (req: { spaceId: string }) => Promise<AgentSession[]>;
      getSession: (sessionId: string) => Promise<AgentSession | undefined>;
      getActivities: (req: { sessionId: string; limit?: number }) => Promise<AgentActivity[]>;
      getActivitiesForSpace: (req: { spaceId: string; limit?: number }) => Promise<AgentActivity[]>;
      getRecentActivities: (req: { limit?: number }) => Promise<AgentActivity[]>;
      getStats: () => Promise<{
        totalSessions: number;
        activeSessions: number;
        totalActivities: number;
        connectedRepos: number;
      }>;
      getConnectedRepos: () => Promise<ConnectedRepo[]>;

      // Event subscriptions
      onSessionCreated: (callback: (session: AgentSession) => void) => () => void;
      onSessionUpdated: (callback: (session: AgentSession) => void) => () => void;
      onSessionEnded: (callback: (session: AgentSession) => void) => () => void;
      onActivityNew: (callback: (activity: AgentActivity) => void) => () => void;
    };
  }
}
