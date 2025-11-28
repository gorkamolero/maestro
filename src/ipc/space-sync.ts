import { ipcMain } from 'electron';

// In-memory cache of spaces data (received from renderer)
let spacesCache: unknown[] = [];

export function registerSpaceSyncIPC() {
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
