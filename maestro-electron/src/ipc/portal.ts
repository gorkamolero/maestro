import { ipcMain, BrowserWindow, BrowserView } from 'electron';

const portalViews = new Map<number, BrowserView>();
const creatingPortals = new Set<number>();

export function registerPortalHandler(getMainWindow: () => BrowserWindow | null) {
  // Handler to close all portal views
  ipcMain.handle('close_all_portals', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    for (const [webContentsId, portalView] of portalViews.entries()) {
      try {
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
        return;
      }

      creatingPortals.add(webContents.id);

      const win = getMainWindow();
      if (!win) {
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

      // Listen for body bounds from renderer
      const handleBodyBounds = (_event: unknown, portalId: number, bounds: { x: number, y: number, width: number, height: number }) => {
        console.log('[PORTAL-MAIN] Received bounds for portal', portalId, ':', bounds);

        if (portalId !== webContents.id) {
          console.log('[PORTAL-MAIN] Portal ID mismatch, ignoring');
          return;
        }

        // Check if the portal was destroyed before we got the bounds
        if (!portalViews.has(webContents.id)) {
          console.log('[PORTAL-MAIN] Portal already destroyed, removing listener');
          ipcMain.removeListener('portal-body-bounds', handleBodyBounds);
          return;
        }

        // Check if WebContents or BrowserView was destroyed
        if (portalView.webContents.isDestroyed()) {
          console.log('[PORTAL-MAIN] WebContents destroyed, cleaning up');
          portalViews.delete(webContents.id);
          ipcMain.removeListener('portal-body-bounds', handleBodyBounds);
          return;
        }

        // Remove the listener after successful validation
        ipcMain.removeListener('portal-body-bounds', handleBodyBounds);

        console.log('[PORTAL-MAIN] Adding BrowserView to window');
        // Add the portal to the window
        win.addBrowserView(portalView);

        console.log('[PORTAL-MAIN] Setting bounds:', bounds);
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

        console.log('[PORTAL-MAIN] Setting as top view');
        // Set it as the top view so it appears above browser views
        win.setTopBrowserView(portalView);

        // Give the portal WebContents focus so it receives input events
        webContents.focus();
        console.log('[PORTAL-MAIN] Portal setup complete');
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
          // BrowserView already removed
        }
        portalViews.delete(webContents.id);
      });
    }
  );
}
