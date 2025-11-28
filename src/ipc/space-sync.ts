import { ipcMain, BrowserWindow } from 'electron';

// In-memory cache of spaces data (received from renderer)
let spacesCache: unknown[] = [];
let _getMainWindow: (() => BrowserWindow | null) | null = null;

export function registerSpaceSyncIPC(getMainWindow: () => BrowserWindow | null) {
  _getMainWindow = getMainWindow;

  // Receive spaces update from renderer
  ipcMain.on('spaces:update', (_, spaces: unknown[]) => {
    spacesCache = spaces;
  });
  
  // Handler to get spaces (used by internal main process logic if needed)
  ipcMain.handle('spaces:get-cached', () => {
    return spacesCache;
  });
}

export function getCachedSpaces() {
  return spacesCache;
}

export function requestCreateTab(spaceId: string, type: string, url?: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('spaces:create-tab', { spaceId, type, url });
  }
}

export function requestCreateTerminal(spaceId: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('spaces:create-terminal', { spaceId });
  }
}
