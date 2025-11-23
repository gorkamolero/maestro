import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerBrowserHandlers } from './ipc/browser';
import { registerMetricsHandlers, startMetricsPolling } from './ipc/metrics';
import { registerTerminalHandlers } from './ipc/terminal';

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
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// App lifecycle
app.on('ready', () => {
  // Register IPC handlers after app is ready
  registerBrowserHandlers(getMainWindow);
  registerMetricsHandlers();
  registerTerminalHandlers(getMainWindow);

  // Start metrics polling
  startMetricsPolling(getMainWindow);

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
