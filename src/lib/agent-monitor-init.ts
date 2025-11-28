// Agent Monitor Initialization
// Handles connecting saved repos on app startup

import { agentMonitorActions } from '@/stores/agent-monitor.store';
import { getSpacesStore } from '@/stores/spaces.store';

let initialized = false;

/**
 * Initialize the agent monitor and reconnect all saved repos from spaces.
 * Safe to call multiple times - will only run once.
 */
export async function initializeAgentMonitor(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    // Initialize the agent monitor store (sets up IPC subscriptions)
    await agentMonitorActions.initialize();

    // Reconnect all saved repos from spaces
    const spacesStore = getSpacesStore();
    const reconnectPromises: Promise<void>[] = [];

    for (const space of spacesStore.spaces) {
      if (space.connectedRepo?.monitorAgents) {
        reconnectPromises.push(
          agentMonitorActions.connectRepo(space.id, space.connectedRepo.path).catch((error) => {
            console.warn(`[AgentMonitor] Failed to reconnect repo for space ${space.name}:`, error);
          })
        );
      }
    }

    // Wait for all repos to reconnect (don't block on failures)
    await Promise.allSettled(reconnectPromises);

    console.log('[AgentMonitor] Initialization complete');
  } catch (error) {
    console.error('[AgentMonitor] Initialization failed:', error);
  }
}
