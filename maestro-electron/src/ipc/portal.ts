import { ipcMain, BrowserWindow, BrowserView } from 'electron';

const portalViews = new Map<number, BrowserView>();
const creatingPortals = new Set<number>();

export function registerPortalHandler(getMainWindow: () => BrowserWindow | null) {
  // Handler to close all portal views
  ipcMain.handle('close_all_portals', async () => {
    console.log('[PORTAL] Closing all portal views');
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    for (const [webContentsId, portalView] of portalViews.entries()) {
      try {
        console.log('[PORTAL] Destroying portal view:', webContentsId);
        if (!portalView.webContents.isDestroyed()) {
          mainWindow.removeBrowserView(portalView);
          // @ts-expect-error - destroy exists but isn't typed
          portalView.webContents.destroy();
        }
        portalViews.delete(webContentsId);
      } catch (error) {
        console.error('[PORTAL] Error destroying portal view:', error);
      }
    }
    creatingPortals.clear();
  });
  const mainWindow = getMainWindow();

  if (!mainWindow) return;

  // Intercept window.open() calls and create BrowserViews from their WebContents
  mainWindow.webContents.removeAllListeners('-add-new-contents');
  mainWindow.webContents.addListener(
    '-add-new-contents',
    (event, webContents) => {
      // Prevent duplicate portal creation from React StrictMode
      if (creatingPortals.has(webContents.id) || portalViews.has(webContents.id)) {
        console.log('[PORTAL] Already creating/created portal, ignoring duplicate');
        return;
      }

      creatingPortals.add(webContents.id);
      console.log('[PORTAL] Intercepting window.open(), creating BrowserView from WebContents');

      const win = getMainWindow();
      if (!win) {
        console.error('[PORTAL] Main window not available');
        return;
      }

      // Create a BrowserView using the intercepted WebContents
      const portalView = new BrowserView({ webContents });

      // Set transparent background
      portalView.setBackgroundColor('#00000000');

      // Add it to the window
      win.addBrowserView(portalView);

      // Position it to cover the entire window
      const bounds = win.getContentBounds();
      portalView.setBounds({
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height,
      });

      // Set it as the top view so it appears above browser views
      win.setTopBrowserView(portalView);

      // Store the portal view
      portalViews.set(webContents.id, portalView);
      creatingPortals.delete(webContents.id);

      // Clean up when the portal closes
      webContents.on('destroyed', () => {
        const cleanupWindow = getMainWindow();
        if (!cleanupWindow) return;

        try {
          if (!portalView.webContents.isDestroyed()) {
            cleanupWindow.removeBrowserView(portalView);
          }
        } catch (error) {
          console.log('[PORTAL] BrowserView already removed');
        }
        portalViews.delete(webContents.id);
        console.log('[PORTAL] Portal BrowserView destroyed');
      });
    }
  );
}
