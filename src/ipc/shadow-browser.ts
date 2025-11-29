import { ipcMain, BrowserWindow, session, desktopCapturer } from 'electron';
import type { CaptureSource } from '../renderer/remote-view/types';

// =============================================================================
// Shadow Browser Window
// Creates a frameless BrowserWindow for remote viewing capture
// =============================================================================

interface ShadowWindow {
  id: string;
  window: BrowserWindow;
  clientId: string; // Mobile client that requested this
  url: string;
  spaceId: string;
  partition: string;
}

const shadowWindows = new Map<string, ShadowWindow>();

/**
 * Create a shadow browser window for remote viewing
 */
export function createShadowWindow(options: {
  clientId: string;
  url: string;
  spaceId: string;
  partition?: string;
  width?: number;
  height?: number;
}): ShadowWindow {
  const { clientId, url, spaceId, partition = 'persist:default', width = 1280, height = 720 } = options;

  // Get or create session for this partition
  const browserSession = session.fromPartition(partition);

  // Create frameless window - must be visible for capture to work
  // Cannot minimize - minimized windows can't be captured on macOS
  const window = new BrowserWindow({
    width,
    height,
    frame: false,
    show: true,
    skipTaskbar: true,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      session: browserSession,
    },
  });

  const id = crypto.randomUUID();

  const shadowWindow: ShadowWindow = {
    id,
    window,
    clientId,
    url,
    spaceId,
    partition,
  };

  shadowWindows.set(id, shadowWindow);

  // Load the URL
  window.loadURL(url);

  // Clean up when window is closed
  window.on('closed', () => {
    shadowWindows.delete(id);
  });

  return shadowWindow;
}

/**
 * Get shadow window by ID
 */
export function getShadowWindow(id: string): ShadowWindow | undefined {
  return shadowWindows.get(id);
}

/**
 * Get shadow window by client ID
 */
export function getShadowWindowByClient(clientId: string): ShadowWindow | undefined {
  for (const shadow of shadowWindows.values()) {
    if (shadow.clientId === clientId) {
      return shadow;
    }
  }
  return undefined;
}

/**
 * Close a shadow window
 */
export function closeShadowWindow(id: string): void {
  const shadow = shadowWindows.get(id);
  if (shadow) {
    shadow.window.close();
    shadowWindows.delete(id);
  }
}

/**
 * Close all shadow windows for a client
 */
export function closeShadowWindowsForClient(clientId: string): void {
  for (const [id, shadow] of shadowWindows) {
    if (shadow.clientId === clientId) {
      shadow.window.close();
      shadowWindows.delete(id);
    }
  }
}

/**
 * Get capture source for a shadow window
 */
export async function getShadowWindowCaptureSource(shadowId: string): Promise<CaptureSource | null> {
  const shadow = shadowWindows.get(shadowId);
  if (!shadow) {
    return null;
  }

  const windowTitle = shadow.window.getTitle() || 'Remote Browser';
  const mediaSourceId = shadow.window.getMediaSourceId();

  // Get all window sources for comparison
  const sources = await desktopCapturer.getSources({
    types: ['window'],
    thumbnailSize: { width: 320, height: 180 },
  });

  // Find source by matching the media source ID
  const source = sources.find((s) => s.id === mediaSourceId || s.name === windowTitle);

  if (source) {
    return {
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
    };
  }

  // Fallback: use getMediaSourceId() directly
  return {
    id: mediaSourceId,
    name: windowTitle,
  };
}

/**
 * Navigate shadow window to new URL
 */
export function navigateShadowWindow(id: string, url: string): void {
  const shadow = shadowWindows.get(id);
  if (shadow) {
    shadow.url = url;
    shadow.window.loadURL(url);
  }
}

/**
 * Inject input into shadow window
 * Coordinates are in video dimensions - TouchOverlay handles coordinate mapping
 */
export function injectInputIntoShadow(
  shadowId: string,
  input: { type: string; x?: number; y?: number; deltaX?: number; deltaY?: number; key?: string; modifiers?: string[] }
): boolean {
  const shadow = shadowWindows.get(shadowId);
  if (!shadow) {
    console.warn(`[ShadowBrowser] Shadow window ${shadowId} not found`);
    return false;
  }

  const webContents = shadow.window.webContents;

  // Coordinates are now sent in actual video dimensions (e.g., 1280x720)
  // The mobile TouchOverlay handles all coordinate transformation including object-fit:contain
  const mappedX = Math.round(input.x || 0);
  const mappedY = Math.round(input.y || 0);

  try {
    switch (input.type) {
      case 'click':
        webContents.sendInputEvent({ type: 'mouseDown', x: mappedX, y: mappedY, button: 'left', clickCount: 1 });
        webContents.sendInputEvent({ type: 'mouseUp', x: mappedX, y: mappedY, button: 'left', clickCount: 1 });
        break;
      case 'doubleclick':
        webContents.sendInputEvent({ type: 'mouseDown', x: mappedX, y: mappedY, button: 'left', clickCount: 2 });
        webContents.sendInputEvent({ type: 'mouseUp', x: mappedX, y: mappedY, button: 'left', clickCount: 2 });
        break;
      case 'rightclick':
        webContents.sendInputEvent({ type: 'mouseDown', x: mappedX, y: mappedY, button: 'right', clickCount: 1 });
        webContents.sendInputEvent({ type: 'mouseUp', x: mappedX, y: mappedY, button: 'right', clickCount: 1 });
        break;
      case 'scroll':
        webContents.sendInputEvent({
          type: 'mouseWheel',
          x: mappedX,
          y: mappedY,
          deltaX: input.deltaX || 0,
          deltaY: input.deltaY || 0,
        });
        break;
      case 'key':
        if (input.key) {
          const keyCode = input.key;
          const mods = (input.modifiers || []).map((m) => (m === 'ctrl' ? 'control' : m)) as ('control' | 'alt' | 'shift' | 'meta')[];
          ['keyDown', 'char', 'keyUp'].forEach((type) => {
            webContents.sendInputEvent({
              type: type as 'keyDown' | 'char' | 'keyUp',
              keyCode,
              modifiers: mods,
            });
          });
        }
        break;
      case 'move':
        webContents.sendInputEvent({ type: 'mouseMove', x: mappedX, y: mappedY });
        break;
    }
    return true;
  } catch (err) {
    console.error('[ShadowBrowser] Input injection failed:', err);
    return false;
  }
}

// =============================================================================
// IPC Handlers
// =============================================================================

export function registerShadowBrowserHandlers(): void {
  /**
   * Create a shadow browser window
   */
  ipcMain.handle(
    'shadow-browser:create',
    async (
      _event,
      options: {
        clientId: string;
        url: string;
        spaceId: string;
        partition?: string;
        width?: number;
        height?: number;
      }
    ): Promise<{ id: string; bounds: { width: number; height: number } }> => {
      const shadow = createShadowWindow(options);
      const bounds = shadow.window.getBounds();
      return {
        id: shadow.id,
        bounds: { width: bounds.width, height: bounds.height },
      };
    }
  );

  /**
   * Get capture source for a shadow window
   */
  ipcMain.handle('shadow-browser:get-source', async (_event, shadowId: string): Promise<CaptureSource | null> => {
    return getShadowWindowCaptureSource(shadowId);
  });

  /**
   * Close a shadow window
   */
  ipcMain.handle('shadow-browser:close', async (_event, shadowId: string): Promise<void> => {
    closeShadowWindow(shadowId);
  });

  /**
   * Navigate shadow window to URL
   */
  ipcMain.handle('shadow-browser:navigate', async (_event, shadowId: string, url: string): Promise<void> => {
    navigateShadowWindow(shadowId, url);
  });
}

export function cleanupShadowBrowserHandlers(): void {
  ipcMain.removeHandler('shadow-browser:create');
  ipcMain.removeHandler('shadow-browser:get-source');
  ipcMain.removeHandler('shadow-browser:close');
  ipcMain.removeHandler('shadow-browser:navigate');

  // Close all shadow windows
  for (const [id] of shadowWindows) {
    closeShadowWindow(id);
  }
}
