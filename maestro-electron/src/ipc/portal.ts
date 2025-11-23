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

      // Create a BrowserView using the intercepted WebContents with transparency
      const portalView = new BrowserView({
        webContents,
        webPreferences: {
          devTools: false,
          transparent: true,
        }
      });

      // Set the webContents ID on the window so PortalWindow can access it
      webContents.executeJavaScript(`window.__WEBCONTENTS_ID__ = ${webContents.id}`);

      console.log('[PORTAL] Set __WEBCONTENTS_ID__ on portal window:', webContents.id);

      // Listen for body bounds from renderer
      const handleBodyBounds = (_event: unknown, portalId: number, bounds: { x: number, y: number, width: number, height: number }) => {
        if (portalId !== webContents.id) return;

        console.log('[PORTAL] Received body bounds for portal:', portalId, bounds);

        // Check if the portal was destroyed before we got the bounds
        if (!portalViews.has(webContents.id)) {
          console.log('[PORTAL] Portal was destroyed before bounds arrived, skipping setup');
          ipcMain.removeListener('portal-body-bounds', handleBodyBounds);
          return;
        }

        // Check if WebContents or BrowserView was destroyed
        if (portalView.webContents.isDestroyed()) {
          console.log('[PORTAL] Portal WebContents was destroyed, skipping setup');
          portalViews.delete(webContents.id);
          ipcMain.removeListener('portal-body-bounds', handleBodyBounds);
          return;
        }

        // Remove the listener after successful validation
        ipcMain.removeListener('portal-body-bounds', handleBodyBounds);

        // Add the portal to the window
        win.addBrowserView(portalView);

        // Position it to match the body element
        portalView.setBounds({
          x: Math.round(bounds.x),
          y: Math.round(bounds.y),
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        });

        // Make it auto-resize with the window
        portalView.setAutoResize({
          width: true,
          height: true,
        });

        // Set it as the top view so it appears above browser views
        win.setTopBrowserView(portalView);

        // Give the portal WebContents focus so it receives input events
        webContents.focus();

        console.log('[PORTAL] BrowserView setup complete, WebContents ready');
      };

      ipcMain.on('portal-body-bounds', handleBodyBounds);

      // Store the portal view
      // BrowserView will be positioned when bounds are received from PortalWindow
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
