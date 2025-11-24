import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
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

export interface WorkspaceLayout {
  timelineHeight: number; // Percentage (20-50)
  sidebarWidth: number; // Fixed pixels
  dockHeight: number; // Fixed pixels
}

interface WorkspaceState {
  activeSpaceId: string | null;
  activeTabId: string | null;
  tabs: Tab[];
  layout: WorkspaceLayout;
  viewMode: ViewMode;
  workspaceViewMode: WorkspaceViewMode; // Notes view or Tabs view
  tabsViewMode: TabsViewMode; // Grid or List view for tabs
}

const { store } = await persist<WorkspaceState>(
  {
    activeSpaceId: null,
    activeTabId: null,
    tabs: [],
    layout: {
      timelineHeight: 30,
      sidebarWidth: 200,
      dockHeight: 48,
    },
    viewMode: 'split',
    workspaceViewMode: 'tabs', // Default to tabs view
    tabsViewMode: 'grid', // Default to grid view
  },
  'maestro-workspace',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const workspaceStore = store;

export const workspaceActions = {
  switchSpace: (spaceId: string) => {
    workspaceStore.activeSpaceId = spaceId;
    // Switch to first tab of this space, if any
    const firstTab = workspaceStore.tabs.find((t) => t.spaceId === spaceId);
    if (firstTab) {
      workspaceStore.activeTabId = firstTab.id;
    } else {
      workspaceStore.activeTabId = null;
    }
  },

  openTab: (spaceId: string, type: TabType, title: string, config?: Partial<Tab>) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      spaceId,
      type,
      title,
      status: 'active',
      ...config,
    };

    workspaceStore.tabs.push(newTab);
    workspaceStore.activeSpaceId = spaceId;
    workspaceStore.activeTabId = newTab.id;

    return newTab;
  },

  closeTab: (tabId: string) => {
    const tabIndex = workspaceStore.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = workspaceStore.tabs[tabIndex];
    workspaceStore.tabs.splice(tabIndex, 1);

    // If closing active tab, switch to another in same space
    if (workspaceStore.activeTabId === tabId) {
      const nextTab = workspaceStore.tabs.find((t) => t.spaceId === tab.spaceId);
      workspaceStore.activeTabId = nextTab?.id || null;
    }
  },

  setActiveTab: (tabId: string) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab) {
      workspaceStore.activeTabId = tabId;
      workspaceStore.activeSpaceId = tab.spaceId;
    }
  },

  updateTabStatus: (tabId: string, status: TabStatus) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.status = status;
    }
  },

  setTimelineHeight: (height: number) => {
    workspaceStore.layout.timelineHeight = Math.max(20, Math.min(50, height));
  },

  setViewMode: (mode: ViewMode) => {
    workspaceStore.viewMode = mode;
  },

  setWorkspaceViewMode: (mode: WorkspaceViewMode) => {
    workspaceStore.workspaceViewMode = mode;
  },

  setTabsViewMode: (mode: TabsViewMode) => {
    workspaceStore.tabsViewMode = mode;
  },

  renameTab: (tabId: string, newTitle: string) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.title = newTitle;
    }
  },

  /**
   * Reorder tab within space
   */
  reorderTab(tabId: string, newIndex: number) {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Get tabs in same space
    const spaceTabs = workspaceStore.tabs.filter((t) => t.spaceId === tab.spaceId);
    const safeIndex = Math.min(newIndex, spaceTabs.length - 1);

    // Remove from current position
    const currentIndex = workspaceStore.tabs.findIndex((t) => t.id === tabId);
    workspaceStore.tabs.splice(currentIndex, 1);

    // Calculate global index for insertion (considering tabs from other spaces)
    const tabsBeforeSpace = workspaceStore.tabs.filter(
      (t, idx) => idx < currentIndex && t.spaceId !== tab.spaceId
    ).length;

    workspaceStore.tabs.splice(tabsBeforeSpace + safeIndex, 0, tab);
  },

  updateTabTerminalState: (tabId: string, state: Tab['terminalState']) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab && tab.type === 'terminal') {
      tab.terminalState = state;
    }
  },
};
