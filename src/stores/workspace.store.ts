import { proxy } from 'valtio';

export type TabType = 'terminal' | 'browser' | 'note' | 'agent';
export type TabStatus = 'active' | 'idle' | 'running';

export interface Tab {
  id: string;
  trackId: string;
  type: TabType;
  title: string;
  status: TabStatus;
  segmentId?: string; // Link to timeline segment
  content?: any; // Type-specific content
}

export type ViewMode = 'timeline' | 'workspace' | 'split';

export interface WorkspaceLayout {
  timelineHeight: number; // Percentage (20-50)
  sidebarWidth: number; // Fixed pixels
  dockHeight: number; // Fixed pixels
}

interface WorkspaceState {
  activeTrackId: string | null;
  activeTabId: string | null;
  tabs: Tab[];
  layout: WorkspaceLayout;
  viewMode: ViewMode;
}

export const workspaceStore = proxy<WorkspaceState>({
  activeTrackId: null,
  activeTabId: null,
  tabs: [],
  layout: {
    timelineHeight: 30, // 30% of screen
    sidebarWidth: 200,
    dockHeight: 48,
  },
  viewMode: 'split',
});

export const workspaceActions = {
  switchTrack: (trackId: string) => {
    workspaceStore.activeTrackId = trackId;
    // Switch to first tab of this track, if any
    const firstTab = workspaceStore.tabs.find((t) => t.trackId === trackId);
    if (firstTab) {
      workspaceStore.activeTabId = firstTab.id;
    } else {
      workspaceStore.activeTabId = null;
    }
  },

  openTab: (trackId: string, type: TabType, title: string, segmentId?: string) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      trackId,
      type,
      title,
      status: 'active',
      segmentId,
    };

    workspaceStore.tabs.push(newTab);
    workspaceStore.activeTrackId = trackId;
    workspaceStore.activeTabId = newTab.id;

    return newTab;
  },

  closeTab: (tabId: string) => {
    const tabIndex = workspaceStore.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = workspaceStore.tabs[tabIndex];
    workspaceStore.tabs.splice(tabIndex, 1);

    // If closing active tab, switch to another in same track
    if (workspaceStore.activeTabId === tabId) {
      const nextTab = workspaceStore.tabs.find((t) => t.trackId === tab.trackId);
      workspaceStore.activeTabId = nextTab?.id || null;
    }
  },

  setActiveTab: (tabId: string) => {
    const tab = workspaceStore.tabs.find((t) => t.id === tabId);
    if (tab) {
      workspaceStore.activeTabId = tabId;
      workspaceStore.activeTrackId = tab.trackId;
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
};
