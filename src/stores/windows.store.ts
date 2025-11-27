import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import { getWorkspaceStore } from './workspace.store';

// ============================================================================
// Types
// ============================================================================

export type WindowMode = 'maximized' | 'floating'; // Future: | 'docked'

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowState {
  id: string;
  tabId: string;
  mode: WindowMode;
  position: WindowPosition;
  size: WindowSize;
  zIndex: number;
  isMinimized: boolean;
  // Remember position when switching to maximized
  savedFloatingBounds?: {
    position: WindowPosition;
    size: WindowSize;
  };
}

interface WindowsState {
  windows: WindowState[];
  nextZIndex: number;
  focusedWindowId: string | null;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FLOATING_SIZE: WindowSize = { width: 800, height: 600 };
const MIN_WINDOW_SIZE: WindowSize = { width: 400, height: 300 };

// ============================================================================
// Store
// ============================================================================

const { history: windowsHistory } = await persistWithHistory<WindowsState>(
  {
    windows: [],
    nextZIndex: 1,
    focusedWindowId: null,
  },
  'maestro-windows',
  {
    debounceTime: 2000, // Less frequent saves for drag/resize operations
    omit: ['focusedWindowId', 'nextZIndex'], // Transient state
  }
);

export { windowsHistory };

// Getter that always returns current value
export const getWindowsStore = () => windowsHistory.value;

/**
 * Hook to get reactive windows state.
 */
export function useWindowsStore() {
  const { value } = useSnapshot(windowsHistory);
  return value;
}

// ============================================================================
// Actions
// ============================================================================

export const windowsActions = {
  /**
   * Open a window for a tab. If window already exists, focus it.
   * If mode is different, switch to that mode.
   */
  openWindow: (tabId: string, mode: WindowMode = 'maximized'): WindowState => {
    const store = getWindowsStore();

    // Check if window already exists for this tab
    const existingWindow = store.windows.find((w) => w.tabId === tabId);

    if (existingWindow) {
      // Focus existing window
      windowsActions.focusWindow(existingWindow.id);

      // Switch mode if different
      if (existingWindow.mode !== mode) {
        windowsActions.setMode(existingWindow.id, mode);
      }

      return existingWindow;
    }

    // Calculate centered position for new floating window
    const contentWidth = window.innerWidth;
    const contentHeight = window.innerHeight;
    const centerX = Math.round((contentWidth - DEFAULT_FLOATING_SIZE.width) / 2);
    const centerY = Math.round((contentHeight - DEFAULT_FLOATING_SIZE.height) / 2);

    // Create new window
    const newWindow: WindowState = {
      id: crypto.randomUUID(),
      tabId,
      mode,
      position: { x: Math.max(50, centerX), y: Math.max(50, centerY) },
      size: { ...DEFAULT_FLOATING_SIZE },
      zIndex: store.nextZIndex,
      isMinimized: false,
    };

    store.windows.push(newWindow);
    store.nextZIndex++;
    store.focusedWindowId = newWindow.id;

    return newWindow;
  },

  /**
   * Close a window (does NOT close the tab)
   */
  closeWindow: (windowId: string): void => {
    const store = getWindowsStore();
    const index = store.windows.findIndex((w) => w.id === windowId);

    if (index === -1) return;

    store.windows.splice(index, 1);

    // Clear focused if this was focused
    if (store.focusedWindowId === windowId) {
      // Focus the next highest z-index window
      const sortedWindows = [...store.windows]
        .filter((w) => !w.isMinimized)
        .sort((a, b) => b.zIndex - a.zIndex);

      store.focusedWindowId = sortedWindows[0]?.id || null;
    }
  },

  /**
   * Close all windows for a specific tab (called when tab is closed)
   */
  closeWindowsForTab: (tabId: string): void => {
    const store = getWindowsStore();
    const windowsToClose = store.windows.filter((w) => w.tabId === tabId);

    for (const window of windowsToClose) {
      windowsActions.closeWindow(window.id);
    }
  },

  /**
   * Toggle between maximized and floating modes
   */
  toggleMode: (windowId: string): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    const newMode: WindowMode = window.mode === 'maximized' ? 'floating' : 'maximized';
    windowsActions.setMode(windowId, newMode);
  },

  /**
   * Set window to a specific mode
   */
  setMode: (windowId: string, mode: WindowMode): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window || window.mode === mode) return;

    if (mode === 'maximized' && window.mode === 'floating') {
      // Save current floating bounds before maximizing
      window.savedFloatingBounds = {
        position: { ...window.position },
        size: { ...window.size },
      };
    } else if (mode === 'floating' && window.savedFloatingBounds) {
      // Restore saved floating bounds
      window.position = { ...window.savedFloatingBounds.position };
      window.size = { ...window.savedFloatingBounds.size };
    }

    window.mode = mode;
  },

  /**
   * Bring window to top (focus)
   */
  focusWindow: (windowId: string): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    // If minimized, restore it
    if (window.isMinimized) {
      window.isMinimized = false;
    }

    // Assign new z-index
    window.zIndex = store.nextZIndex;
    store.nextZIndex++;
    store.focusedWindowId = windowId;
  },

  /**
   * Update window position (during/after dragging)
   */
  updatePosition: (windowId: string, position: WindowPosition): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    window.position = position;
  },

  /**
   * Update window size (during/after resizing)
   */
  updateSize: (windowId: string, size: WindowSize): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    // Enforce minimum size
    window.size = {
      width: Math.max(MIN_WINDOW_SIZE.width, size.width),
      height: Math.max(MIN_WINDOW_SIZE.height, size.height),
    };
  },

  /**
   * Update both position and size atomically (for resize from corners/edges)
   */
  updateBounds: (windowId: string, position: WindowPosition, size: WindowSize): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    window.position = position;
    window.size = {
      width: Math.max(MIN_WINDOW_SIZE.width, size.width),
      height: Math.max(MIN_WINDOW_SIZE.height, size.height),
    };
  },

  /**
   * Minimize window
   */
  minimizeWindow: (windowId: string): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    window.isMinimized = true;

    // Clear focused if this was focused
    if (store.focusedWindowId === windowId) {
      const sortedWindows = [...store.windows]
        .filter((w) => !w.isMinimized && w.id !== windowId)
        .sort((a, b) => b.zIndex - a.zIndex);

      store.focusedWindowId = sortedWindows[0]?.id || null;
    }
  },

  /**
   * Restore window from minimized
   */
  restoreWindow: (windowId: string): void => {
    const store = getWindowsStore();
    const window = store.windows.find((w) => w.id === windowId);

    if (!window) return;

    window.isMinimized = false;
    windowsActions.focusWindow(windowId);
  },

  /**
   * Cycle focus to next window
   */
  cycleFocusNext: (): void => {
    const store = getWindowsStore();
    const visibleWindows = store.windows
      .filter((w) => !w.isMinimized)
      .sort((a, b) => a.zIndex - b.zIndex);

    if (visibleWindows.length === 0) return;

    const currentIndex = visibleWindows.findIndex((w) => w.id === store.focusedWindowId);
    const nextIndex = (currentIndex + 1) % visibleWindows.length;

    windowsActions.focusWindow(visibleWindows[nextIndex].id);
  },

  /**
   * Cycle focus to previous window
   */
  cycleFocusPrev: (): void => {
    const store = getWindowsStore();
    const visibleWindows = store.windows
      .filter((w) => !w.isMinimized)
      .sort((a, b) => a.zIndex - b.zIndex);

    if (visibleWindows.length === 0) return;

    const currentIndex = visibleWindows.findIndex((w) => w.id === store.focusedWindowId);
    const prevIndex = currentIndex <= 0 ? visibleWindows.length - 1 : currentIndex - 1;

    windowsActions.focusWindow(visibleWindows[prevIndex].id);
  },

  /**
   * Get window by tab ID
   */
  getWindowByTabId: (tabId: string): WindowState | undefined => {
    const store = getWindowsStore();
    return store.windows.find((w) => w.tabId === tabId);
  },

  /**
   * Validate windows on startup - remove orphaned windows (tabs that no longer exist)
   */
  validateWindows: (): void => {
    const store = getWindowsStore();
    const workspaceStore = getWorkspaceStore();

    const validTabIds = new Set(workspaceStore.tabs.map((t) => t.id));

    // Remove windows for tabs that no longer exist
    store.windows = store.windows.filter((w) => validTabIds.has(w.tabId));

    // Recalculate nextZIndex from max existing
    if (store.windows.length > 0) {
      store.nextZIndex = Math.max(...store.windows.map((w) => w.zIndex)) + 1;
    } else {
      store.nextZIndex = 1;
    }

    // Clamp windows to visible bounds
    const contentWidth = window.innerWidth;
    const contentHeight = window.innerHeight;

    for (const win of store.windows) {
      // Ensure window is at least partially visible
      win.position.x = Math.max(0, Math.min(win.position.x, contentWidth - 100));
      win.position.y = Math.max(0, Math.min(win.position.y, contentHeight - 100));

      // Ensure window fits in viewport
      win.size.width = Math.min(win.size.width, contentWidth);
      win.size.height = Math.min(win.size.height, contentHeight);
    }
  },
};
