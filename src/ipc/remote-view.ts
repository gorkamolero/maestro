import { ipcMain, desktopCapturer, BrowserWindow, BrowserView } from 'electron';
import type { RemoteInput, ViewportInfo, CaptureSource, ViewableBrowser } from '../renderer/remote-view/types';
import { getBrowserViewsMap } from './browser';

type InputButton = 'left' | 'right' | 'middle';
type ElectronModifier = 'control' | 'alt' | 'shift' | 'meta';

// =============================================================================
// Input Injection (Exported for direct use by WebSocket handler)
// =============================================================================

/**
 * Inject input into a BrowserView
 * Exported so WebSocket handler can call directly without IPC round-trip
 */
export function injectInputIntoBrowser(
  browserId: string,
  input: RemoteInput,
  viewport: ViewportInfo,
  getMainWindow: () => BrowserWindow | null
): boolean {
  const viewsMap = getBrowserViewsMap();
  const viewInfo = viewsMap.get(browserId);
  
  if (!viewInfo) {
    console.warn(`[RemoteView] BrowserView ${browserId} not found`);
    return false;
  }

  const view = viewInfo.view;
  const mainWindow = getMainWindow();

  // Ensure window is focused for input injection
  if (mainWindow && !mainWindow.isFocused()) {
    mainWindow.focus();
  }

  // Map coordinates from mobile viewport to BrowserView
  const mappedX = Math.round((input.x || 0) * (viewport.viewBounds.width / viewport.remoteWidth));
  const mappedY = Math.round((input.y || 0) * (viewport.viewBounds.height / viewport.remoteHeight));

  try {
    switch (input.type) {
      case 'click':
        injectClick(view, mappedX, mappedY, 'left', 1);
        break;
      case 'doubleclick':
        injectClick(view, mappedX, mappedY, 'left', 2);
        break;
      case 'rightclick':
        injectClick(view, mappedX, mappedY, 'right', 1);
        break;
      case 'scroll':
        injectScroll(view, mappedX, mappedY, input.deltaX, input.deltaY);
        break;
      case 'key':
        if (input.key) {
          injectKey(view, input.key, input.modifiers);
        }
        break;
      case 'move':
        injectMouseMove(view, mappedX, mappedY);
        break;
    }
    return true;
  } catch (err) {
    console.error('[RemoteView] Input injection failed:', err);
    return false;
  }
}

// =============================================================================
// IPC Handlers
// =============================================================================

/**
 * Register Remote View IPC handlers
 * 
 * Main process responsibilities:
 * 1. Enumerate capture sources (returns IDs only - no MediaStream!)
 * 2. List available browser tabs
 * 3. Inject input events into BrowserViews
 * 4. Relay WebRTC signals (renderer ↔ mobile via WebSocket)
 */
export function registerRemoteViewHandlers(getMainWindow: () => BrowserWindow | null): void {
  
  // =========================================================================
  // Source Enumeration
  // =========================================================================
  
  /**
   * Get available capture sources
   * Returns serializable data only - source IDs, names, thumbnails
   */
  ipcMain.handle('remote-view:get-sources', async (): Promise<CaptureSource[]> => {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 }
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  });

  /**
   * Get the Maestro window source specifically
   */
  ipcMain.handle('remote-view:get-maestro-source', async (): Promise<CaptureSource | null> => {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 320, height: 180 }
    });

    const maestro = sources.find(s => s.name === 'Maestro' || s.name.includes('Maestro'));
    if (!maestro) return null;

    return {
      id: maestro.id,
      name: maestro.name,
      thumbnail: maestro.thumbnail.toDataURL()
    };
  });

  // =========================================================================
  // Browser Tab Listing
  // =========================================================================

  /**
   * Get list of browser tabs that can be viewed
   */
  ipcMain.handle('remote-view:get-browsers', async (): Promise<ViewableBrowser[]> => {
    const viewsMap = getBrowserViewsMap();
    const browsers: ViewableBrowser[] = [];

    for (const [label, { view }] of viewsMap) {
      try {
        const url = view.webContents.getURL();
        const title = view.webContents.getTitle();
        const bounds = view.getBounds();

        browsers.push({
          id: label,
          label,
          url,
          title,
          bounds
        });
      } catch {
        // View might be destroyed, skip
      }
    }

    return browsers;
  });

  /**
   * Get bounds of a specific browser
   */
  ipcMain.handle('remote-view:get-browser-bounds', async (_event, browserId: string): Promise<{ width: number; height: number } | null> => {
    const viewsMap = getBrowserViewsMap();
    const viewInfo = viewsMap.get(browserId);
    
    if (!viewInfo) return null;
    
    const bounds = viewInfo.view.getBounds();
    return { width: bounds.width, height: bounds.height };
  });

  // =========================================================================
  // Input Injection (IPC version - used by renderer)
  // =========================================================================

  /**
   * Inject input event into a BrowserView (called from renderer)
   */
  ipcMain.handle('remote-view:inject-input', async (
    _event,
    browserId: string,
    input: RemoteInput,
    viewport: ViewportInfo
  ): Promise<boolean> => {
    return injectInputIntoBrowser(browserId, input, viewport, getMainWindow);
  });
}

// =============================================================================
// Input Injection Helpers
// =============================================================================

function injectClick(view: BrowserView, x: number, y: number, button: InputButton, clickCount: number): void {
  view.webContents.sendInputEvent({ type: 'mouseDown', x, y, button, clickCount });
  view.webContents.sendInputEvent({ type: 'mouseUp', x, y, button, clickCount });
}

function injectScroll(view: BrowserView, x: number, y: number, deltaX?: number, deltaY?: number): void {
  view.webContents.sendInputEvent({
    type: 'mouseWheel',
    x,
    y,
    deltaX: deltaX || 0,
    deltaY: deltaY || 0
  });
}

function injectKey(view: BrowserView, keyCode: string, modifiers?: string[]): void {
  const electronMods = (modifiers || []).map(m => m === 'ctrl' ? 'control' : m) as ElectronModifier[];
  
  (['keyDown', 'char', 'keyUp'] as const).forEach(type => {
    view.webContents.sendInputEvent({
      type,
      keyCode,
      modifiers: electronMods
    } as Electron.KeyboardInputEvent);
  });
}

function injectMouseMove(view: BrowserView, x: number, y: number): void {
  view.webContents.sendInputEvent({ type: 'mouseMove', x, y } as Electron.MouseInputEvent);
}

// =============================================================================
// Cleanup
// =============================================================================

export function cleanupRemoteViewHandlers(): void {
  ipcMain.removeHandler('remote-view:get-sources');
  ipcMain.removeHandler('remote-view:get-maestro-source');
  ipcMain.removeHandler('remote-view:get-browsers');
  ipcMain.removeHandler('remote-view:get-browser-bounds');
  ipcMain.removeHandler('remote-view:inject-input');
}
