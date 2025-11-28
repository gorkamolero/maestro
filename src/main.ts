import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerBrowserHandlers, getBrowserViewsMap } from './ipc/browser';
import { registerTerminalHandlers } from './ipc/terminal';
import { registerLauncherHandlers } from './ipc/launcher';
import { registerPortalHandler } from './ipc/portal';
import { registerAgentHandlers } from './ipc/agent';
import { registerAgentMonitorHandlers, cleanupAgentMonitorHandlers } from './ipc/agent-monitor';
import { registerPerformanceHandlers, cleanupPerformanceHandlers } from './ipc/performance';
import { registerRemoteServerIPC } from './ipc/remote-server';
import { registerSpaceSyncIPC } from './ipc/space-sync';

// Get icon path - different in dev vs production
const getIconPath = () => {
  if (app.isPackaged) {
    // In production, resources are in the app's resources folder
    return path.join(process.resourcesPath, 'resources', 'icon.png');
  }
  // In development, use the source resources folder
  return path.join(__dirname, '..', '..', 'resources', 'icon.png');
};

// Handle creating/removing shortcuts on Windows
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const getMainWindow = () => mainWindow;

const createWindow = () => {
  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true, // Enable to allow node-pty in preload
      sandbox: false, // Disable sandbox to allow native modules like node-pty
    },
  });

  // Load the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// App lifecycle
app.on('ready', () => {
  // Create window first
  createWindow();

  // Register portal handler to intercept window.open()
  registerPortalHandler(getMainWindow);

  // Then register IPC handlers
  registerBrowserHandlers(getMainWindow);
  registerTerminalHandlers(getMainWindow);
  registerLauncherHandlers();
  registerAgentHandlers(getMainWindow);
  registerAgentMonitorHandlers(getMainWindow);
  registerPerformanceHandlers(getMainWindow, getBrowserViewsMap);
  registerRemoteServerIPC();
  registerSpaceSyncIPC(getMainWindow);
});

app.on('window-all-closed', () => {
  cleanupPerformanceHandlers();
  cleanupAgentMonitorHandlers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
