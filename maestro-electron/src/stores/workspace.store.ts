import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { LaunchConfig, SavedState } from '@/types/launcher';

export type TabType = 'terminal' | 'browser' | 'agent' | 'app-launcher' | 'tasks';
export type TabStatus = 'active' | 'idle' | 'running';
export type TabsViewMode = 'grid' | 'list';

export interface Tab {
  id: string;
  spaceId: string;
  type: TabType;
  title: string;
  status: TabStatus;
  disabled?: boolean; // Disabled tabs won't launch when clicked
  segmentId?: string; // Link to timeline segment
  content?: unknown; // Type-specific content
  terminalState?: {
    buffer: string;
    workingDir: string | null;
    scrollPosition: number;
    theme: 'termius-dark' | 'dracula' | 'nord';
  };
  // For app launcher items
  appLauncherConfig?: {
    connectedAppId: string;
    icon: string | null;
    color: string | null;
    launchConfig: LaunchConfig;
    savedState: SavedState | null;
  };
}

export type ViewMode = 'timeline' | 'workspace' | 'split';
export type WorkspaceViewMode = 'notes' | 'tabs';
export type AppViewMode = 'control-room' | 'workspace';

export interface WorkspaceLayout {
  timelineHeight: number; // Percentage (20-50)
  sidebarWidth: number; // Fixed pixels
  dockHeight: number; // Fixed pixels
}

interface ClosedTab extends Tab {
  closedAt: Date;
}

interface WorkspaceState {
  activeSpaceId: string | null;
  activeTabId: string | null;
  tabs: Tab[];
  recentlyClosedTabs: ClosedTab[]; // Keep last 10 closed tabs
  layout: WorkspaceLayout;
  viewMode: ViewMode;
  workspaceViewMode: WorkspaceViewMode; // Notes view or Tabs view
  tabsViewMode: TabsViewMode; // Grid or List view for tabs
  appViewMode: AppViewMode; // Control Room or Workspace view
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: workspaceHistory } = await persistWithHistory<WorkspaceState>(
  {
    activeSpaceId: null,
    activeTabId: null,
    tabs: [],
    recentlyClosedTabs: [],
    layout: {
      timelineHeight: 30,
      sidebarWidth: 200,
      dockHeight: 48,
    },
    viewMode: 'split',
    workspaceViewMode: 'tabs', // Default to tabs view
    tabsViewMode: 'grid', // Default to grid view
    appViewMode: 'control-room', // Default to control room
  },
  'maestro-workspace',
  {
    debounceTime: 1000,
  }
);

export { workspaceHistory };

// Getter that always returns current value (important after undo/redo which replaces .value)
export const getWorkspaceStore = () => workspaceHistory.value;

/**
 * Hook to get reactive workspace state. Use this instead of useSnapshot(workspaceStore).
 * This properly handles undo/redo by subscribing to the history proxy.
 */
export function useWorkspaceStore() {
  const { value } = useSnapshot(workspaceHistory);
  return value;
}

export const workspaceActions = {
  switchSpace: (spaceId: string) => {
    const store = getWorkspaceStore();
    store.activeSpaceId = spaceId;
    // Switch to first tab of this space, if any
    const firstTab = store.tabs.find((t) => t.spaceId === spaceId);
    if (firstTab) {
      store.activeTabId = firstTab.id;
    } else {
      store.activeTabId = null;
    }
  },

  openTab: (spaceId: string, type: TabType, title: string, config?: Partial<Tab>) => {
    const store = getWorkspaceStore();
    const newTab: Tab = {
      id: crypto.randomUUID(),
      spaceId,
      type,
      title,
      status: 'active',
      ...config,
    };

    store.tabs.push(newTab);
    store.activeSpaceId = spaceId;
    store.activeTabId = newTab.id;

    return newTab;
  },

  closeTab: (tabId: string) => {
    const store = getWorkspaceStore();
    const tabIndex = store.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = store.tabs[tabIndex];

    store.recentlyClosedTabs.unshift({
      ...tab,
      closedAt: new Date(),
    });

    if (store.recentlyClosedTabs.length > 10) {
      store.recentlyClosedTabs = store.recentlyClosedTabs.slice(0, 10);
    }

    store.tabs.splice(tabIndex, 1);

    if (store.activeTabId === tabId) {
      const nextTab = store.tabs.find((t) => t.spaceId === tab.spaceId);
      store.activeTabId = nextTab?.id || null;
    }
  },

  restoreRecentlyClosedTab: (closedTabIndex: number = 0) => {
    const store = getWorkspaceStore();
    const closedTab = store.recentlyClosedTabs[closedTabIndex];
    if (!closedTab) return null;

    // Remove closedAt before restoring
    const { closedAt, ...tabData } = closedTab;

    // Generate new ID to avoid conflicts
    const restoredTab: Tab = {
      ...tabData,
      id: crypto.randomUUID(),
    };

    store.tabs.push(restoredTab);
    store.activeSpaceId = restoredTab.spaceId;
    store.activeTabId = restoredTab.id;

    // Remove from closed tabs
    store.recentlyClosedTabs.splice(closedTabIndex, 1);

    return restoredTab;
  },

  setActiveTab: (tabId: string) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab) {
      store.activeTabId = tabId;
      store.activeSpaceId = tab.spaceId;
    }
  },

  updateTabStatus: (tabId: string, status: TabStatus) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.status = status;
    }
  },

  setTimelineHeight: (height: number) => {
    const store = getWorkspaceStore();
    store.layout.timelineHeight = Math.max(20, Math.min(50, height));
  },

  setViewMode: (mode: ViewMode) => {
    const store = getWorkspaceStore();
    store.viewMode = mode;
  },

  setWorkspaceViewMode: (mode: WorkspaceViewMode) => {
    const store = getWorkspaceStore();
    store.workspaceViewMode = mode;
  },

  setTabsViewMode: (mode: TabsViewMode) => {
    const store = getWorkspaceStore();
    store.tabsViewMode = mode;
  },

  renameTab: (tabId: string, newTitle: string) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.title = newTitle;
    }
  },

  /**
   * Reorder tab within space
   */
  reorderTab(tabId: string, newIndex: number) {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Get tabs in same space
    const spaceTabs = store.tabs.filter((t) => t.spaceId === tab.spaceId);
    const safeIndex = Math.min(newIndex, spaceTabs.length - 1);

    // Remove from current position
    const currentIndex = store.tabs.findIndex((t) => t.id === tabId);
    store.tabs.splice(currentIndex, 1);

    // Calculate global index for insertion (considering tabs from other spaces)
    const tabsBeforeSpace = store.tabs.filter(
      (t, idx) => idx < currentIndex && t.spaceId !== tab.spaceId
    ).length;

    store.tabs.splice(tabsBeforeSpace + safeIndex, 0, tab);
  },

  updateTabTerminalState: (tabId: string, state: Tab['terminalState']) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab && tab.type === 'terminal') {
      tab.terminalState = state;
    }
  },

  moveTabToSpace: (tabId: string, targetSpaceId: string) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Update the tab's spaceId
    tab.spaceId = targetSpaceId;

    // If this was the active tab, clear it since it's moved to another space
    if (store.activeTabId === tabId) {
      // Find another tab in the current space
      const remainingTab = store.tabs.find(
        (t) => t.spaceId === store.activeSpaceId && t.id !== tabId
      );
      store.activeTabId = remainingTab?.id || null;
    }
  },

  /**
   * Toggle tab disabled state. Disabled tabs won't launch when clicked.
   */
  toggleTabDisabled: (tabId: string) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.disabled = !tab.disabled;
    }
  },

  /**
   * Set tab disabled state explicitly
   */
  setTabDisabled: (tabId: string, disabled: boolean) => {
    const store = getWorkspaceStore();
    const tab = store.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.disabled = disabled;
    }
  },

  /**
   * Get all enabled (non-disabled) tabs for a space
   */
  getEnabledTabsForSpace: (spaceId: string): Tab[] => {
    const store = getWorkspaceStore();
    return store.tabs.filter((t) => t.spaceId === spaceId && !t.disabled);
  },

  /**
   * Set the app view mode (control-room or workspace)
   */
  setAppViewMode: (mode: AppViewMode) => {
    const store = getWorkspaceStore();
    store.appViewMode = mode;
  },

  /**
   * Maximize a space - switch to workspace view with that space active
   */
  maximizeSpace: (spaceId: string) => {
    const store = getWorkspaceStore();
    store.activeSpaceId = spaceId;
    store.appViewMode = 'workspace';
    // Switch to first tab of this space, if any
    const firstTab = store.tabs.find((t) => t.spaceId === spaceId);
    if (firstTab) {
      store.activeTabId = firstTab.id;
    } else {
      store.activeTabId = null;
    }
  },

  /**
   * Return to the control room view
   */
  returnToControlRoom: () => {
    const store = getWorkspaceStore();
    store.appViewMode = 'control-room';
  },
};
