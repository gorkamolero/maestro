import { useCallback } from 'react';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { profileActions } from '@/stores/profile.store';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import { getBrowserState } from '@/stores/browser.store';
import { urlHistoryActions } from '@/stores/url-history.store';
import { launchTab } from '@/hooks/useTabClick';
import type { Tab, Space } from '@/stores/workspace.store';
import type { Profile } from '@/stores/profile.store';

interface InstalledApp {
  name: string;
  path: string;
  bundleId: string | null;
  icon: string | null;
}

interface UseCommandPaletteActionsProps {
  activeSpaceId: string | null;
  activeTab: Tab | undefined;
  spaces: Space[];
  tabs: Tab[];
  profiles: Profile[];
  onClose: () => void;
}

/**
 * Custom hook containing all command palette action handlers
 */
export function useCommandPaletteActions({
  activeSpaceId,
  activeTab,
  spaces,
  tabs,
  profiles,
  onClose,
}: UseCommandPaletteActionsProps) {
  const handleNewTerminal = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'terminal', 'Terminal');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewBrowser = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'browser', 'Browser');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewNote = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'note', 'Note');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
    onClose();
  }, [spaces.length, onClose]);

  const handleAddAppFavorite = useCallback(() => {
    launcherStore.isAddModalOpen = true;
    onClose();
  }, [onClose]);

  const handleLaunchApp = useCallback(
    (appId: string) => {
      launcherActions.launchApp(appId, {
        filePath: null,
        deepLink: null,
        launchMethod: 'app-only',
      });
      onClose();
    },
    [onClose]
  );

  const handleAddInstalledAppTab = useCallback(
    async (app: InstalledApp) => {
      if (!activeSpaceId) return;
      try {
        const registeredApp = await launcherActions.registerApp(app.path);
        workspaceActions.openTab(activeSpaceId, 'app-launcher', registeredApp.name, {
          appLauncherConfig: {
            connectedAppId: registeredApp.id,
            icon: registeredApp.icon,
            color: null,
            launchConfig: {
              filePath: null,
              deepLink: null,
              launchMethod: 'app-only',
            },
            savedState: null,
          },
        });
      } catch (error) {
        console.error('Failed to register app:', error);
      }
      onClose();
    },
    [activeSpaceId, onClose]
  );

  const handleGoToUrl = useCallback(
    (url?: string) => {
      const spaceId = activeSpaceId || spaces[0]?.id;
      if (!spaceId) return;

      if (url) {
        const newTab = workspaceActions.openTab(spaceId, 'browser', url);
        getBrowserState(newTab.id, url);
        urlHistoryActions.addUrl(url);
      } else {
        if (!activeTab || activeTab.type !== 'browser') {
          workspaceActions.openTab(spaceId, 'browser', 'Browser');
        }
      }
      onClose();
    },
    [activeSpaceId, activeTab, spaces, onClose]
  );

  const handleDuplicateTab = useCallback(() => {
    if (!activeTab || !activeSpaceId) return;
    const newTitle = `${activeTab.title} (Copy)`;
    workspaceActions.openTab(activeSpaceId, activeTab.type, newTitle);
    onClose();
  }, [activeTab, activeSpaceId, onClose]);

  const handleRestoreClosedTab = useCallback(
    (index: number) => {
      workspaceActions.restoreRecentlyClosedTab(index);
      onClose();
    },
    [onClose]
  );

  const handleLaunchAllTabs = useCallback(() => {
    if (!activeSpaceId) return;
    const spaceTabs = tabs.filter((t) => t.spaceId === activeSpaceId && !t.disabled);
    spaceTabs.forEach((tab) => {
      launchTab(tab.id);
    });
    onClose();
  }, [activeSpaceId, tabs, onClose]);

  const handleCreateProfile = useCallback(() => {
    const name = `Profile ${profiles.length + 1}`;
    const profile = profileActions.createProfile(name);
    profileActions.switchProfile(profile.id);
    onClose();
  }, [profiles.length, onClose]);

  const handleAssignProfileToSpace = useCallback(
    (profileId: string) => {
      if (!activeSpaceId) return;
      spacesActions.setSpaceProfile(activeSpaceId, profileId === 'none' ? undefined : profileId);
      onClose();
    },
    [activeSpaceId, onClose]
  );

  const handleSwitchToTab = useCallback(
    (tabId: string) => {
      workspaceActions.setActiveTab(tabId);
      onClose();
    },
    [onClose]
  );

  const handleSwitchToSpace = useCallback(
    (spaceId: string) => {
      workspaceActions.switchSpace(spaceId);
      onClose();
    },
    [onClose]
  );

  return {
    handleNewTerminal,
    handleNewBrowser,
    handleNewNote,
    handleNewSpace,
    handleAddAppFavorite,
    handleLaunchApp,
    handleAddInstalledAppTab,
    handleGoToUrl,
    handleDuplicateTab,
    handleRestoreClosedTab,
    handleLaunchAllTabs,
    handleCreateProfile,
    handleAssignProfileToSpace,
    handleSwitchToTab,
    handleSwitchToSpace,
  };
}

export type { InstalledApp };
