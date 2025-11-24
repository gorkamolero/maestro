import { useCallback } from 'react';
import { workspaceActions, type Tab } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';

export function useTabClick(tab: Tab) {
  const handleClick = useCallback(() => {
    // Don't launch disabled tabs
    if (tab.disabled) {
      return;
    }

    if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
      // Launch the app
      launcherActions.launchApp(
        tab.appLauncherConfig.connectedAppId,
        tab.appLauncherConfig.launchConfig
      );
    } else {
      // Regular tab - set as active
      workspaceActions.setActiveTab(tab.id);
    }
  }, [tab]);

  return handleClick;
}

/**
 * Launch a single tab (used by launchAllTabs)
 */
export function launchTab(tab: Tab): void {
  // Don't launch disabled tabs
  if (tab.disabled) {
    return;
  }

  if (tab.type === 'app-launcher' && tab.appLauncherConfig) {
    launcherActions.launchApp(
      tab.appLauncherConfig.connectedAppId,
      tab.appLauncherConfig.launchConfig
    );
  }
  // For non-app-launcher tabs, we just set them active (they don't "launch" externally)
}
