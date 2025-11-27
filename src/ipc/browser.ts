import { ipcMain, BrowserWindow, BrowserView, session } from 'electron';

// ============================================================================
// Types
// ============================================================================

interface ViewInfo {
  view: BrowserView;
  label: string;
  zIndex: number;
  mode: 'maximized' | 'floating';
  isVisible: boolean;
}

// ============================================================================
// State
// ============================================================================

const browserViews = new Map<string, ViewInfo>();
const creatingViews = new Set<string>();
let nextZIndex = 1;

/**
 * Get the browser views map for external access (e.g., performance monitoring)
 */
export function getBrowserViewsMap(): Map<string, { view: BrowserView; label: string }> {
  const result = new Map<string, { view: BrowserView; label: string }>();
  for (const [label, info] of browserViews) {
    result.set(label, { view: info.view, label: info.label });
  }
  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Reorder all views based on their z-index.
 * Maximized views are always behind floating views.
 * Portals are handled separately by portal.ts and are always on top.
 */
function reorderViews(mainWindow: BrowserWindow) {
  // Get all visible views sorted by z-index
  const visibleViews = Array.from(browserViews.values())
    .filter((v) => v.isVisible)
    .sort((a, b) => {
      // Maximized views always come first (lower z-order)
      if (a.mode === 'maximized' && b.mode !== 'maximized') return -1;
      if (a.mode !== 'maximized' && b.mode === 'maximized') return 1;
      // Then sort by zIndex
      return a.zIndex - b.zIndex;
    });

  // Remove all browser views
  for (const viewInfo of browserViews.values()) {
    try {
      mainWindow.removeBrowserView(viewInfo.view);
    } catch {
      // View may already be removed
    }
  }

  // Re-add in correct order (last added is on top)
  for (const viewInfo of visibleViews) {
    mainWindow.addBrowserView(viewInfo.view);
  }

  // Set the topmost as top (for proper input handling)
  if (visibleViews.length > 0) {
    mainWindow.setTopBrowserView(visibleViews[visibleViews.length - 1].view);
  }
}

// ============================================================================
// IPC Handlers
// ============================================================================

export function registerBrowserHandlers(getMainWindow: () => BrowserWindow | null) {
  /**
   * Create or show a browser view
   * Now supports multiple views with mode parameter
   */
  ipcMain.handle('create_browser_view', async (_event, options) => {
    const { label, url, x, y, width, height, partition, mode = 'floating' } = options;
    const mainWindow = getMainWindow();

    if (!mainWindow) return label;

    // Prevent duplicate creation (race condition from React StrictMode)
    if (creatingViews.has(label)) {
      return label;
    }

    // Check if view already exists - if so, update it and show it
    const existingInfo = browserViews.get(label);
    if (existingInfo) {
      existingInfo.mode = mode;
      existingInfo.zIndex = nextZIndex++;
      existingInfo.isVisible = true;

      existingInfo.view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });

      reorderViews(mainWindow);
      existingInfo.view.webContents.focus();

      return label;
    }

    // Mark as creating BEFORE any work
    creatingViews.add(label);

    // If maximized mode, hide other maximized views (but keep floating ones)
    if (mode === 'maximized') {
      for (const [otherLabel, info] of browserViews.entries()) {
        if (otherLabel !== label && info.mode === 'maximized' && info.isVisible) {
          info.isVisible = false;
        }
      }
    }

    // Get or create session for this profile's partition
    const sessionPartition = partition || 'persist:default';
    const browserSession = session.fromPartition(sessionPartition);

    // Create new view with profile-specific session
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: browserSession,
      },
    });

    const viewInfo: ViewInfo = {
      view,
      label,
      zIndex: nextZIndex++,
      mode,
      isVisible: true,
    };

    browserViews.set(label, viewInfo);

    view.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });

    reorderViews(mainWindow);

    await view.webContents.loadURL(url);

    // Done creating
    creatingViews.delete(label);

    // Listen to ALL navigation events to keep URL and history synced
    const sendNavigationUpdate = () => {
      const currentUrl = view.webContents.getURL();
      const entries = view.webContents.navigationHistory.getAllEntries();
      const activeIndex = view.webContents.navigationHistory.getActiveIndex();

      mainWindow?.webContents.send('browser-navigation-updated', {
        label,
        url: currentUrl,
        history: {
          entries,
          activeIndex,
        },
      });
    };

    view.webContents.on('did-navigate', sendNavigationUpdate);
    view.webContents.on('did-navigate-in-page', sendNavigationUpdate);

    // Focus event handling
    view.webContents.on('focus', () => {
      mainWindow?.webContents.send('browser-view-focus-changed', { label, focused: true });
    });

    view.webContents.on('blur', () => {
      mainWindow?.webContents.send('browser-view-focus-changed', { label, focused: false });
    });

    return label;
  });

  /**
   * Close/destroy a browser view
   */
  ipcMain.handle('close_browser_view', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (viewInfo && mainWindow) {
      mainWindow.removeBrowserView(viewInfo.view);
      // @ts-expect-error - destroy exists but isn't typed
      viewInfo.view.webContents.destroy();
      browserViews.delete(label);
    }
  });

  /**
   * Update browser view position and size
   */
  ipcMain.handle('update_browser_bounds', async (_event, { label, x, y, width, height }) => {
    const viewInfo = browserViews.get(label);
    if (viewInfo) {
      viewInfo.view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    }
  });

  /**
   * Bring a view to the front (update z-order)
   */
  ipcMain.handle('bring_view_to_front', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (viewInfo && mainWindow) {
      viewInfo.zIndex = nextZIndex++;
      viewInfo.isVisible = true;
      reorderViews(mainWindow);
      viewInfo.view.webContents.focus();
    }
  });

  /**
   * Show a specific browser view (restore from hidden)
   */
  ipcMain.handle('show_browser_view', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (viewInfo && mainWindow) {
      viewInfo.isVisible = true;
      reorderViews(mainWindow);
    }
  });

  /**
   * Hide a specific browser view (without destroying)
   */
  ipcMain.handle('hide_browser_view', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (viewInfo && mainWindow) {
      viewInfo.isVisible = false;
      mainWindow.removeBrowserView(viewInfo.view);
    }
  });

  /**
   * Set the mode of a browser view
   */
  ipcMain.handle('set_browser_view_mode', async (_event, { label, mode }) => {
    const viewInfo = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (viewInfo && mainWindow) {
      viewInfo.mode = mode;

      // If setting to maximized, hide other maximized views
      if (mode === 'maximized') {
        for (const [otherLabel, info] of browserViews.entries()) {
          if (otherLabel !== label && info.mode === 'maximized' && info.isVisible) {
            info.isVisible = false;
          }
        }
      }

      reorderViews(mainWindow);
    }
  });

  /**
   * Navigate browser to URL
   */
  ipcMain.handle('navigate_browser', async (_event, { label, url }) => {
    const viewInfo = browserViews.get(label);
    if (viewInfo) {
      viewInfo.view.webContents.loadURL(url);
    }
  });

  /**
   * Navigate browser back
   */
  ipcMain.handle('browser_go_back', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    if (viewInfo && viewInfo.view.webContents.navigationHistory.canGoBack()) {
      viewInfo.view.webContents.navigationHistory.goBack();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return viewInfo.view.webContents.getURL();
    }
    return viewInfo?.view.webContents.getURL() || '';
  });

  /**
   * Navigate browser forward
   */
  ipcMain.handle('browser_go_forward', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    if (viewInfo && viewInfo.view.webContents.navigationHistory.canGoForward()) {
      viewInfo.view.webContents.navigationHistory.goForward();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return viewInfo.view.webContents.getURL();
    }
    return viewInfo?.view.webContents.getURL() || '';
  });

  /**
   * Check if browser can go back
   */
  ipcMain.handle('browser_can_go_back', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    return viewInfo?.view.webContents.navigationHistory.canGoBack() || false;
  });

  /**
   * Check if browser can go forward
   */
  ipcMain.handle('browser_can_go_forward', async (_event, { label }) => {
    const viewInfo = browserViews.get(label);
    return viewInfo?.view.webContents.navigationHistory.canGoForward() || false;
  });

  /**
   * Hide all browser views (used when showing non-browser content)
   */
  ipcMain.handle('hide_all_browser_views', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    for (const viewInfo of browserViews.values()) {
      viewInfo.isVisible = false;
      mainWindow.removeBrowserView(viewInfo.view);
    }
  });

  /**
   * Get info about all active views (for debugging/state sync)
   */
  ipcMain.handle('get_browser_views_info', async () => {
    return Array.from(browserViews.entries()).map(([label, info]) => ({
      label,
      zIndex: info.zIndex,
      mode: info.mode,
      isVisible: info.isVisible,
    }));
  });
}
