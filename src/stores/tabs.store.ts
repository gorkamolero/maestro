import { proxy } from 'valtio';
import type { Segment } from '@/types';

export interface Tab {
  id: string;
  segmentId: string;
  title: string;
  type: Segment['type'];
  isActive: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
}

export const tabsStore = proxy<TabsState>({
  tabs: [],
  activeTabId: null,
});

export const tabsActions = {
  openTab: (segment: Segment) => {
    // Check if tab already exists
    const existingTab = tabsStore.tabs.find((t) => t.segmentId === segment.id);

    if (existingTab) {
      // Just activate the existing tab
      tabsActions.setActiveTab(existingTab.id);
      return;
    }

    // Create new tab
    const newTab: Tab = {
      id: crypto.randomUUID(),
      segmentId: segment.id,
      title: segment.title,
      type: segment.type,
      isActive: true,
    };

    // Deactivate all other tabs
    tabsStore.tabs.forEach((tab) => {
      tab.isActive = false;
    });

    // Add new tab
    tabsStore.tabs.push(newTab);
    tabsStore.activeTabId = newTab.id;
  },

  closeTab: (tabId: string) => {
    const index = tabsStore.tabs.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    const wasActive = tabsStore.tabs[index].isActive;
    tabsStore.tabs.splice(index, 1);

    // If closed tab was active, activate another tab
    if (wasActive && tabsStore.tabs.length > 0) {
      const newActiveIndex = Math.min(index, tabsStore.tabs.length - 1);
      tabsStore.tabs[newActiveIndex].isActive = true;
      tabsStore.activeTabId = tabsStore.tabs[newActiveIndex].id;
    } else if (tabsStore.tabs.length === 0) {
      tabsStore.activeTabId = null;
    }
  },

  closeOtherTabs: (tabId: string) => {
    const tab = tabsStore.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tabsStore.tabs = [tab];
    tab.isActive = true;
    tabsStore.activeTabId = tab.id;
  },

  closeAllTabs: () => {
    tabsStore.tabs = [];
    tabsStore.activeTabId = null;
  },

  setActiveTab: (tabId: string) => {
    tabsStore.tabs.forEach((tab) => {
      tab.isActive = tab.id === tabId;
    });
    tabsStore.activeTabId = tabId;
  },
};
