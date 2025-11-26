/**
 * Launcher IPC Handlers
 * Handles communication between renderer and main process for launcher functionality
 */

import { ipcMain, dialog } from 'electron';
import type {
  ConnectedApp,
  RunningApp,
  WindowState,
} from '../types/launcher';
import * as macosUtils from '../lib/macos-utils';

// In-memory storage for connected apps
// In production, this would be persisted to a database
const connectedApps = new Map<string, ConnectedApp>();

export function registerLauncherHandlers() {
  /**
   * Register a connected app by extracting its info from .app bundle
   */
  ipcMain.handle(
    'launcher:register-app',
    async (_event, appPath: string): Promise<ConnectedApp> => {
      try {
        const appInfo = await macosUtils.getAppInfo(appPath);
        connectedApps.set(appInfo.id, appInfo);
        return appInfo;
      } catch (error) {
        throw new Error(
          `Failed to register app: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  /**
   * Get all registered connected apps
   */
  ipcMain.handle('launcher:get-connected-apps', async (): Promise<ConnectedApp[]> => {
    return Array.from(connectedApps.values());
  });

  /**
   * Get a specific connected app by ID
   */
  ipcMain.handle(
    'launcher:get-connected-app',
    async (_event, appId: string): Promise<ConnectedApp | null> => {
      return connectedApps.get(appId) || null;
    }
  );


  /**
   * Get list of running applications
   */
  ipcMain.handle('launcher:get-running-apps', async (): Promise<RunningApp[]> => {
    return await macosUtils.getRunningApps();
  });

  /**
   * Check if a specific app is running
   */
  ipcMain.handle(
    'launcher:is-app-running',
    async (_event, bundleId: string): Promise<boolean> => {
      return await macosUtils.isAppRunning(bundleId);
    }
  );

  /**
   * Bring app to front
   */
  ipcMain.handle('launcher:bring-to-front', async (_event, bundleId: string): Promise<void> => {
    await macosUtils.bringAppToFront(bundleId);
  });

  /**
   * Capture window state for an app
   */
  ipcMain.handle(
    'launcher:capture-window-state',
    async (_event, bundleId: string): Promise<WindowState[]> => {
      return await macosUtils.captureWindowState(bundleId);
    }
  );

  /**
   * Open native file picker to select an app
   */
  ipcMain.handle('launcher:pick-app', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Application',
      defaultPath: '/Applications',
      properties: ['openFile'],
      filters: [{ name: 'Applications', extensions: ['app'] }],
    });

    return result.canceled ? null : result.filePaths[0];
  });

  /**
   * Open native file picker to select a file for an app
   */
  ipcMain.handle(
    'launcher:pick-file',
    async (_event, appId: string): Promise<string | null> => {
      const app = connectedApps.get(appId);
      if (!app) {
        return null;
      }

      const filters = [];
      if (app.capabilities.fileAssociations.length > 0) {
        filters.push({
          name: 'Supported Files',
          extensions: app.capabilities.fileAssociations,
        });
      }
      filters.push({ name: 'All Files', extensions: ['*'] });

      const result = await dialog.showOpenDialog({
        title: 'Select File',
        properties: ['openFile'],
        filters,
      });

      return result.canceled ? null : result.filePaths[0];
    }
  );

  /**
   * Launch app with deep link
   */
  ipcMain.handle('launcher:launch-deeplink', async (_event, deepLink: string): Promise<void> => {
    await macosUtils.launchDeepLink(deepLink);
  });

  /**
   * Launch app with file
   */
  ipcMain.handle('launcher:launch-with-file', async (_event, appPath: string, filePath: string): Promise<void> => {
    await macosUtils.launchApp(appPath, filePath);
  });

  /**
   * Launch app only
   */
  ipcMain.handle('launcher:launch-app-only', async (_event, appPath: string): Promise<void> => {
    await macosUtils.launchApp(appPath);
  });

  /**
   * Get list of all installed applications
   */
  ipcMain.handle('launcher:get-installed-apps', async () => {
    return await macosUtils.getInstalledApps();
  });

  /**
   * Open native directory picker
   */
  ipcMain.handle('dialog:openDirectory', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Directory',
      properties: ['openDirectory', 'createDirectory'],
    });

    return result.canceled ? null : result.filePaths[0];
  });
}
