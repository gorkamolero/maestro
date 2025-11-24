import { useCallback } from 'react';
import { workspaceActions, type Tab } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';

export function useTabClick(tab: Tab) {
  const handleClick = useCallback(() => {
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
