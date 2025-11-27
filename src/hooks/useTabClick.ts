import { useCallback } from 'react';
import { workspaceActions, getWorkspaceStore, type Tab } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';

export function useTabClick(tab: Tab) {
  const handleClick = useCallback(() => {
    // Don't launch disabled tabs
    if (tab.disabled) {
      return;
    }

    if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
      // Launch the app - use launchTab to get fresh state from store
      launchTab(tab.id);
    } else {
      // Regular tab - set as active
      workspaceActions.setActiveTab(tab.id);
    }
  }, [tab]);

  return handleClick;
}

/**
 * Launch a single tab by ID (used by launchAllTabs and click handlers)
 *
 * IMPORTANT: This function reads fresh state from the store using the tabId,
 * rather than relying on potentially stale snapshot data from props.
 * This ensures context (filePath, deepLink) is always up-to-date.
 *
 * Note: Agent tabs are NOT launched via this function.
 * They are configured and started through the AgentDrawer component.
 */
export function launchTab(tabId: string): void {
  // Get fresh tab state from the store
  const store = getWorkspaceStore();
  const tab = store.tabs.find((t) => t.id === tabId);

  if (!tab) {
    return;
  }

  // Don't launch disabled tabs
  if (tab.disabled) {
    return;
  }

  // Agent tabs are handled via AgentDrawer, not launched directly
  if (tab.type === 'agent') {
    return;
  }

  if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
    // First try to find app by ID
    let connectedApp = launcherActions.getConnectedApp(tab.appLauncherConfig.connectedAppId);

    // If not found by ID, try by name (handles ID mismatch from app re-registration)
    if (!connectedApp) {
      connectedApp = launcherActions.getConnectedAppByName(tab.title);
      if (connectedApp) {
        // Auto-heal: Update the tab's connectedAppId to the correct ID
        console.log(
          `[launchTab] Auto-healing connectedAppId for "${tab.title}": ${tab.appLauncherConfig.connectedAppId} -> ${connectedApp.id}`
        );
        workspaceActions.updateAppLauncherConfig(tab.id, {
          connectedAppId: connectedApp.id,
        });
      }
    }

    if (connectedApp) {
      launcherActions.launchApp(connectedApp.id, tab.appLauncherConfig.launchConfig);
    } else {
      console.error(
        `[launchTab] Connected app not found for tab "${tab.title}" (ID: ${tab.appLauncherConfig.connectedAppId})`
      );
    }
  }
  // For non-app-launcher tabs, we just set them active (they don't "launch" externally)
}
