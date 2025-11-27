import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

export interface NavigationEntry {
  url: string;
  title: string;
}

export interface NavigationHistory {
  entries: NavigationEntry[];
  activeIndex: number;
}

export interface BrowserState {
  url: string;
  title?: string;
  history: NavigationHistory;
}

interface BrowserStoreState {
  browsers: Record<string, BrowserState>; // keyed by tab ID
}

const { store } = await persist<BrowserStoreState>(
  {
    browsers: {},
  },
  'maestro-browser',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const browserStore = store;

// Helper to get or initialize browser state for a tab
export function getBrowserState(tabId: string, initialUrl: string): BrowserState {
  if (!browserStore.browsers[tabId]) {
    browserStore.browsers[tabId] = {
      url: initialUrl,
      history: {
        entries: [{ url: initialUrl, title: '' }],
        activeIndex: 0,
      },
    };
  }
  return browserStore.browsers[tabId];
}

// Helper to update navigation state
export function updateBrowserNavigation(tabId: string, url: string, history: NavigationHistory) {
  const browser = browserStore.browsers[tabId];
  if (browser) {
    browser.url = url;
    browser.history = history;
  }
}

// Helper to compute navigation capabilities
export function canGoBack(tabId: string): boolean {
  const browser = browserStore.browsers[tabId];
  if (!browser) return false;
  return browser.history.activeIndex > 0;
}

export function canGoForward(tabId: string): boolean {
  const browser = browserStore.browsers[tabId];
  if (!browser) return false;
  return browser.history.activeIndex < browser.history.entries.length - 1;
}

// Helper to remove browser state when tab closes
export function removeBrowserState(tabId: string) {
  delete browserStore.browsers[tabId];
}
