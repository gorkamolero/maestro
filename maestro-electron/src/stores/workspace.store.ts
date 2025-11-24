import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type { LaunchConfig, SavedState } from '@/types/launcher';

export type TabType = 'terminal' | 'browser' | 'note' | 'agent' | 'app-launcher' | 'tasks';
export type TabStatus = 'active' | 'idle' | 'running';

export interface Tab {
  id: string;
  spaceId: string;
  type: TabType;
  title: string;
  status: TabStatus;
  segmentId?: string; // Link to timeline segment
  content?: unknown; // Type-specific content
  isFavorite?: boolean; // Whether this tab is favorited
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
  // For note tabs
  noteState?: {
    noteId: string;
    viewMode: 'tab' | 'panel';
  };
}

export type ViewMode = 'timeline' | 'workspace' | 'split';

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

  renameTab: (tabId: string, newTitle: string) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab) {
      tab.title = newTitle;
    }
  },

  toggleTabFavorite: (tabId: string) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const newIsFavorite = !tab.isFavorite;
    const targetZone = newIsFavorite ? 'favorites' : 'tabs';

    // Use moveTabToZone with index 0 (insert at beginning)
    workspaceActions.moveTabToZone(tabId, targetZone, 0);
  },

  /**
   * Move tab from one zone to another at specific index
   */
  moveTabToZone(
    tabId: string,
    targetZone: 'favorites' | 'tabs',
    targetIndex: number
  ) {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Update favorite status
    const shouldBeFavorite = targetZone === 'favorites';
    tab.isFavorite = shouldBeFavorite;

    // Remove tab from current position
    const currentIndex = workspaceStore.tabs.findIndex((t) => t.id === tabId);
    workspaceStore.tabs.splice(currentIndex, 1);

    // Get tabs in target zone
    const targetZoneTabs = workspaceStore.tabs.filter((t) =>
      targetZone === 'favorites' ? t.isFavorite : !t.isFavorite
    );

    // Calculate safe insertion index
    const safeIndex = Math.min(targetIndex, targetZoneTabs.length);

    // Insert tab at target position
    // Find global index for insertion
    if (targetZone === 'favorites') {
      // Insert at beginning of favorites
      workspaceStore.tabs.splice(safeIndex, 0, tab);
    } else {
      // Insert after all favorites
      const favCount = workspaceStore.tabs.filter((t) => t.isFavorite).length;
      workspaceStore.tabs.splice(favCount + safeIndex, 0, tab);
    }
  },

  /**
   * Reorder tab within same zone
   */
  reorderTabInZone(
    tabId: string,
    zone: 'favorites' | 'tabs',
    newIndex: number
  ) {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Remove from current position
    const currentIndex = workspaceStore.tabs.findIndex((t) => t.id === tabId);
    workspaceStore.tabs.splice(currentIndex, 1);

    // Calculate new global index
    if (zone === 'favorites') {
      const safeIndex = Math.min(
        newIndex,
        workspaceStore.tabs.filter((t) => t.isFavorite).length
      );
      workspaceStore.tabs.splice(safeIndex, 0, tab);
    } else {
      const favCount = workspaceStore.tabs.filter((t) => t.isFavorite).length;
      const zoneTabs = workspaceStore.tabs.filter((t) => !t.isFavorite);
      const safeIndex = Math.min(newIndex, zoneTabs.length);
      workspaceStore.tabs.splice(favCount + safeIndex, 0, tab);
    }
  },

  updateTabTerminalState: (tabId: string, state: Tab['terminalState']) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab && tab.type === 'terminal') {
      tab.terminalState = state;
    }
  },
};
