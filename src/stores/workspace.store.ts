import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

export type TabType = 'terminal' | 'browser' | 'note' | 'agent';
export type TabStatus = 'active' | 'idle' | 'running';

export interface Tab {
  id: string;
  spaceId: string;
  type: TabType;
  title: string;
  status: TabStatus;
  segmentId?: string; // Link to timeline segment
  content?: any; // Type-specific content
  isFavorite?: boolean; // Whether this tab is favorited
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

  openTab: (spaceId: string, type: TabType, title: string, segmentId?: string) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      spaceId,
      type,
      title,
      status: 'active',
      segmentId,
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
    if (tab) {
      tab.isFavorite = !tab.isFavorite;
    }
  },
};
