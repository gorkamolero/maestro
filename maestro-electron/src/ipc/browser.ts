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

    view.webContents.loadURL(url);

    // Listen to navigation events
    view.webContents.on('did-navigate', (_event, url) => {
      mainWindow?.webContents.send('webview-navigation', { label, url });
    });

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      mainWindow?.webContents.send('webview-navigation', { label, url });
    });

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
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return view.webContents.getURL();
    }
    return view?.webContents.getURL() || '';
  });

  ipcMain.handle('browser_go_forward', async (_event, { label }) => {
    const view = browserViews.get(label);
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward();
      await new Promise((resolve) => setTimeout(resolve, 100));
      return view.webContents.getURL();
    }
    return view?.webContents.getURL() || '';
  });
}
