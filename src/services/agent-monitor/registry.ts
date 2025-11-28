// Agent Monitor - Agent Registry
// Central storage for sessions and activities

import { EventEmitter } from 'events';
import type { AgentSession, AgentActivity, AgentType, ConnectedRepo } from '@/types/agent-events';

const MAX_ACTIVITIES_PER_SESSION = 500;
const MAX_TOTAL_ACTIVITIES = 2000;

interface RegistryEvents {
  'session:created': AgentSession;
  'session:updated': AgentSession;
  'session:ended': AgentSession;
  'activity:new': AgentActivity;
}

export interface AgentRegistry {
  on<K extends keyof RegistryEvents>(event: K, listener: (data: RegistryEvents[K]) => void): this;
  emit<K extends keyof RegistryEvents>(event: K, data: RegistryEvents[K]): boolean;
}

export class AgentRegistry extends EventEmitter {
  private sessions: Map<string, AgentSession> = new Map();
  private activities: Map<string, AgentActivity[]> = new Map(); // sessionId -> activities
  private globalActivities: AgentActivity[] = []; // Ring buffer for all activities
  private connectedRepos: Map<string, ConnectedRepo> = new Map(); // absolutePath -> config

  // ============================================
  // REPO MANAGEMENT
  // ============================================

  connectRepo(repo: ConnectedRepo): void {
    this.connectedRepos.set(repo.absolutePath, repo);
    console.log(`[AgentRegistry] Connected repo: ${repo.absolutePath} -> Space ${repo.spaceId}`);
  }

  disconnectRepo(absolutePath: string): void {
    this.connectedRepos.delete(absolutePath);
    console.log(`[AgentRegistry] Disconnected repo: ${absolutePath}`);
  }

  isRepoConnected(projectPath: string): boolean {
    // Check if this path matches any connected repo
    for (const [repoPath] of this.connectedRepos) {
      if (projectPath === repoPath || projectPath.startsWith(repoPath + '/')) {
        return true;
      }
    }
    return false;
  }

  getConnectedRepoForPath(projectPath: string): ConnectedRepo | null {
    for (const [repoPath, config] of this.connectedRepos) {
      if (projectPath === repoPath || projectPath.startsWith(repoPath + '/')) {
        return config;
      }
    }
    return null;
  }

  getConnectedRepos(): ConnectedRepo[] {
    return Array.from(this.connectedRepos.values());
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  getOrCreateSession(
    sessionId: string,
    agentType: AgentType,
    projectPath: string,
    filePath: string
  ): AgentSession {
    let session = this.sessions.get(sessionId);

    if (!session) {
      const now = new Date().toISOString();
      session = {
        id: sessionId,
        agentType,
        source: 'external', // Default to external, can be updated
        projectPath,
        cwd: projectPath,
        startedAt: now,
        lastActivityAt: now,
        status: 'active',
        filePath,
        messageCount: 0,
        toolUseCount: 0,
      };

      this.sessions.set(sessionId, session);
      this.activities.set(sessionId, []);
      this.emit('session:created', session);
      console.log(`[AgentRegistry] Created session: ${sessionId} for ${agentType} at ${projectPath}`);
    }

    return session;
  }

  updateSession(sessionId: string, updates: Partial<AgentSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivityAt: new Date().toISOString() });
      this.emit('session:updated', session);
    }
  }

  endSession(sessionId: string, reason?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'ended';
      session.lastActivityAt = new Date().toISOString();
      this.emit('session:ended', session);
      console.log(`[AgentRegistry] Session ended: ${sessionId}, reason: ${reason || 'unknown'}`);
    }
  }

  markSessionIdle(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      session.status = 'idle';
      this.emit('session:updated', session);
      console.log(`[AgentRegistry] Session idle: ${sessionId}`);
    }
  }

  markSessionActive(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'idle') {
      session.status = 'active';
      session.lastActivityAt = new Date().toISOString();
      this.emit('session:updated', session);
    }
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionsForRepo(absolutePath: string): AgentSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.projectPath === absolutePath || s.projectPath.startsWith(absolutePath + '/')
    );
  }

  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status !== 'ended');
  }

  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByAgentType(agentType: AgentType): AgentSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.agentType === agentType);
  }

  // ============================================
  // ACTIVITY MANAGEMENT
  // ============================================

  addActivity(activity: AgentActivity): void {
    // Add to session-specific list
    const sessionActivities = this.activities.get(activity.sessionId);
    if (sessionActivities) {
      sessionActivities.push(activity);
      // Trim if over limit
      if (sessionActivities.length > MAX_ACTIVITIES_PER_SESSION) {
        sessionActivities.shift();
      }
    }

    // Add to global ring buffer
    this.globalActivities.push(activity);
    if (this.globalActivities.length > MAX_TOTAL_ACTIVITIES) {
      this.globalActivities.shift();
    }

    // Update session stats
    const session = this.sessions.get(activity.sessionId);
    if (session) {
      session.lastActivityAt = activity.timestamp;
      session.status = 'active';

      if (activity.type === 'user_prompt' || activity.type === 'assistant_message') {
        session.messageCount++;
      }
      if (activity.type === 'tool_use') {
        session.toolUseCount++;
      }
    }

    this.emit('activity:new', activity);
  }

  getActivitiesForSession(sessionId: string, limit?: number): AgentActivity[] {
    const activities = this.activities.get(sessionId) || [];
    if (limit) {
      return activities.slice(-limit);
    }
    return [...activities];
  }

  getRecentActivities(limit: number = 50): AgentActivity[] {
    return this.globalActivities.slice(-limit);
  }

  getActivitiesForRepo(absolutePath: string, limit: number = 100): AgentActivity[] {
    const sessions = this.getSessionsForRepo(absolutePath);
    const sessionIds = new Set(sessions.map((s) => s.id));

    return this.globalActivities.filter((a) => sessionIds.has(a.sessionId)).slice(-limit);
  }

  // ============================================
  // CLEANUP
  // ============================================

  pruneOldSessions(maxAgeMs: number): number {
    const now = Date.now();
    let pruned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.status === 'ended' && now - new Date(session.lastActivityAt).getTime() > maxAgeMs) {
        this.sessions.delete(sessionId);
        this.activities.delete(sessionId);
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`[AgentRegistry] Pruned ${pruned} old sessions`);
    }

    return pruned;
  }

  clear(): void {
    this.sessions.clear();
    this.activities.clear();
    this.globalActivities = [];
    console.log('[AgentRegistry] Cleared all sessions and activities');
  }

  // ============================================
  // STATS
  // ============================================

  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalActivities: number;
    connectedRepos: number;
  } {
    return {
      totalSessions: this.sessions.size,
      activeSessions: this.getActiveSessions().length,
      totalActivities: this.globalActivities.length,
      connectedRepos: this.connectedRepos.size,
    };
  }
}
