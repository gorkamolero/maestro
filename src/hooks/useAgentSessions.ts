// Agent Sessions Hooks
// Reactive hooks for accessing agent session data

import { useMemo } from 'react';
import {
  useAgentMonitorStore,
  getSessionsForSpace,
  getActivitiesForSpace,
} from '@/stores/agent-monitor.store';
import type { AgentSession, AgentActivity } from '@/types/agent-events';

/**
 * Get all agent sessions for a space (reactive)
 */
export function useAgentSessionsForSpace(spaceId: string): AgentSession[] {
  const store = useAgentMonitorStore();

  return useMemo(() => {
    // We access the proxy through the snapshot to trigger reactivity
    // but call the function with the actual store data
    void store.sessions; // Trigger reactivity on sessions changes
    void store.connectedRepos; // Trigger reactivity on repo changes
    return getSessionsForSpace(spaceId);
  }, [spaceId, store.sessions, store.connectedRepos]);
}

/**
 * Get count of active agents for a space (reactive)
 */
export function useActiveAgentCount(spaceId: string): number {
  const sessions = useAgentSessionsForSpace(spaceId);
  return useMemo(() => sessions.filter((s) => s.status === 'active').length, [sessions]);
}

/**
 * Get recent activities for a space (reactive)
 */
export function useAgentActivitiesForSpace(spaceId: string, limit = 50): AgentActivity[] {
  const store = useAgentMonitorStore();

  return useMemo(() => {
    void store.recentActivities;
    void store.sessions;
    void store.connectedRepos;
    return getActivitiesForSpace(spaceId, limit);
  }, [spaceId, limit, store.recentActivities, store.sessions, store.connectedRepos]);
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
