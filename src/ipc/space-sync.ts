import { ipcMain, BrowserWindow } from 'electron';
import type { TaskItem } from '../shared/types';

// In-memory cache of spaces data (received from renderer)
let spacesCache: unknown[] = [];
// Tasks cache: spaceId -> TaskItem[]
let tasksCache: Record<string, TaskItem[]> = {};
let _getMainWindow: (() => BrowserWindow | null) | null = null;

export function registerSpaceSyncIPC(getMainWindow: () => BrowserWindow | null) {
  _getMainWindow = getMainWindow;

  // Receive spaces update from renderer
  ipcMain.on('spaces:update', (_, spaces: unknown[]) => {
    spacesCache = spaces;
  });

  // Receive tasks update from renderer (spaceId -> tasks mapping)
  ipcMain.on('tasks:update', (_, tasks: Record<string, TaskItem[]>) => {
    tasksCache = tasks;
  });

  // Handler to get spaces (used by internal main process logic if needed)
  ipcMain.handle('spaces:get-cached', () => {
    return spacesCache;
  });
}

export function getCachedSpaces() {
  return spacesCache;
}

export function getCachedTasks(): Record<string, TaskItem[]> {
  return tasksCache;
}

// === Tab Management ===

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

export function requestCloseTab(tabId: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('spaces:close-tab', { tabId });
  }
}

// === Task Management ===

export function requestToggleTask(taskId: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('tasks:toggle', { taskId });
  }
}

export function requestCreateTask(spaceId: string, content: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('tasks:create', { spaceId, content });
  }
}

export function requestDeleteTask(taskId: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('tasks:delete', { taskId });
  }
}

export function requestUpdateTask(taskId: string, content: string) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('tasks:update-content', { taskId, content });
  }
}

// === Space Management ===

export interface SpaceUpdate {
  name?: string;
  primaryColor?: string;
  secondaryColor?: string;
  icon?: string;
  next?: string | null;
  isActive?: boolean;
}

export function requestUpdateSpace(spaceId: string, updates: SpaceUpdate) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('spaces:update-space', { spaceId, updates });
  }
}

export function requestSetSpaceNext(spaceId: string, next: string | null) {
  const win = _getMainWindow?.();
  if (win) {
    win.webContents.send('spaces:set-next', { spaceId, next });
  }
}
