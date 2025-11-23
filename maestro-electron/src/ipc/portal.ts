import { BrowserWindow, BrowserView } from 'electron';

const portalViews = new Map<number, BrowserView>();

export function registerPortalHandler(getMainWindow: () => BrowserWindow | null) {
  const mainWindow = getMainWindow();

  if (!mainWindow) return;

  // Intercept window.open() calls and create BrowserViews from their WebContents
  mainWindow.webContents.removeAllListeners('-add-new-contents');
  mainWindow.webContents.addListener(
    '-add-new-contents',
    (event, webContents) => {
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
