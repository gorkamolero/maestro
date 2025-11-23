import { ipcMain, BrowserWindow, BrowserView } from 'electron';

const browserViews = new Map<string, BrowserView>();

export function registerBrowserHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('create_browser_view', async (_event, options) => {
    const { label, url, x, y, width, height } = options;
    const mainWindow = getMainWindow();

    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (!mainWindow) return label;

    mainWindow.setBrowserView(view);
    view.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });

    await view.webContents.loadURL(url);

    // Listen to ALL navigation events to keep URL and history synced
    const sendNavigationUpdate = () => {
      const currentUrl = view.webContents.getURL();
      const entries = view.webContents.navigationHistory.getAllEntries();
      const activeIndex = view.webContents.navigationHistory.getActiveIndex();

      console.log('[BACKEND] Sending navigation update:', { label, url: currentUrl, entries, activeIndex });

      mainWindow?.webContents.send('browser-navigation-updated', {
        label,
        url: currentUrl,
        history: {
          entries,
          activeIndex
        }
      });
    };

    view.webContents.on('did-navigate', sendNavigationUpdate);
    view.webContents.on('did-navigate-in-page', sendNavigationUpdate);

    browserViews.set(label, view);
    return label;
  });

  ipcMain.handle('close_browser_view', async (_event, { label }) => {
    const view = browserViews.get(label);
    const mainWindow = getMainWindow();

    if (view && mainWindow) {
      mainWindow.removeBrowserView(view);
      // @ts-expect-error - destroy exists but isn't typed
      view.webContents.destroy();
      browserViews.delete(label);
    }
  });

  ipcMain.handle('update_browser_bounds', async (_event, { label, x, y, width, height }) => {
    const view = browserViews.get(label);
    if (view) {
      view.setBounds({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    }
  });

  ipcMain.handle('navigate_browser', async (_event, { label, url }) => {
    const view = browserViews.get(label);
    if (view) {
      view.webContents.loadURL(url);
    }
  });

  ipcMain.handle('browser_go_back', async (_event, { label }) => {
    const view = browserViews.get(label);
    if (view && view.webContents.navigationHistory.canGoBack()) {
      view.webContents.navigationHistory.goBack();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return view.webContents.getURL();
    }
    return view?.webContents.getURL() || '';
  });

  ipcMain.handle('browser_go_forward', async (_event, { label }) => {
    const view = browserViews.get(label);
    if (view && view.webContents.navigationHistory.canGoForward()) {
      view.webContents.navigationHistory.goForward();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return view.webContents.getURL();
    }
    return view?.webContents.getURL() || '';
  });

  ipcMain.handle('browser_can_go_back', async (_event, { label }) => {
    const view = browserViews.get(label);
    return view?.webContents.navigationHistory.canGoBack() || false;
  });

  ipcMain.handle('browser_can_go_forward', async (_event, { label }) => {
    const view = browserViews.get(label);
    return view?.webContents.navigationHistory.canGoForward() || false;
  });
}
