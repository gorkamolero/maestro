import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

export interface BrowserState {
  url: string;
  title?: string;
  history: string[];
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
      history: [initialUrl],
    };
  }
  return browserStore.browsers[tabId];
}

// Helper to update URL
export function updateBrowserUrl(tabId: string, url: string) {
  const browser = browserStore.browsers[tabId];
  if (browser) {
    browser.url = url;
    if (!browser.history.includes(url)) {
      browser.history.push(url);
    }
  }
}

// Helper to remove browser state when tab closes
export function removeBrowserState(tabId: string) {
  delete browserStore.browsers[tabId];
}
