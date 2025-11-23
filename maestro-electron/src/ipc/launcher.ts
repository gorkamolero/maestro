/**
 * Launcher IPC Handlers
 * Handles communication between renderer and main process for launcher functionality
 */

import { ipcMain, dialog } from 'electron';
import type {
  ConnectedApp,
  Favorite,
  LaunchResult,
  RunningApp,
  SavedState,
  WindowState,
} from '../types/launcher';
import * as macosUtils from '../lib/macos-utils';

// In-memory storage for connected apps and favorites
// In production, these would be persisted to a database
const connectedApps = new Map<string, ConnectedApp>();
const favorites = new Map<string, Favorite>();

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
   * Create a new favorite
   */
  ipcMain.handle(
    'launcher:create-favorite',
    async (_event, favoriteData: Omit<Favorite, 'id' | 'createdAt' | 'updatedAt'>): Promise<Favorite> => {
      const favorite: Favorite = {
        ...favoriteData,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      favorites.set(favorite.id, favorite);
      return favorite;
    }
  );

  /**
   * Get all favorites for a workspace
   */
  ipcMain.handle(
    'launcher:get-favorites',
    async (_event, workspaceId: string): Promise<Favorite[]> => {
      return Array.from(favorites.values()).filter(
        (f) => f.workspaceId === workspaceId
      );
    }
  );

  /**
   * Update a favorite
   */
  ipcMain.handle(
    'launcher:update-favorite',
    async (_event, favoriteId: string, updates: Partial<Favorite>): Promise<Favorite> => {
      const favorite = favorites.get(favoriteId);
      if (!favorite) {
        throw new Error(`Favorite not found: ${favoriteId}`);
      }

      const updated = {
        ...favorite,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      favorites.set(favoriteId, updated);
      return updated;
    }
  );

  /**
   * Delete a favorite
   */
  ipcMain.handle('launcher:delete-favorite', async (_event, favoriteId: string): Promise<void> => {
    favorites.delete(favoriteId);
  });

  /**
   * Launch a favorite
   */
  ipcMain.handle(
    'launcher:launch-favorite',
    async (
      _event,
      favoriteId: string,
      restoreState = true
    ): Promise<LaunchResult> => {
      const favorite = favorites.get(favoriteId);
      if (!favorite) {
        return {
          success: false,
          method: 'app-only',
          warnings: [],
          error: {
            code: 'favorite_not_found',
            message: 'Favorite not found',
            recoverable: false,
          },
        };
      }

      const app = connectedApps.get(favorite.connectedAppId);
      if (!app) {
        return {
          success: false,
          method: 'app-only',
          warnings: [],
          error: {
            code: 'app_not_found',
            message: 'Connected app not found',
            recoverable: false,
          },
        };
      }

      try {
        const warnings: LaunchResult['warnings'] = [];
        let method: LaunchResult['method'] = 'app-only';

        // Determine launch method
        if (favorite.launchConfig.deepLink) {
          method = 'deeplink';
          await macosUtils.launchDeepLink(favorite.launchConfig.deepLink);
        } else if (favorite.launchConfig.filePath) {
          method = 'file';
          await macosUtils.launchApp(app.path, favorite.launchConfig.filePath);
        } else {
          method = 'app-only';
          await macosUtils.launchApp(app.path);
        }

        // Wait a bit for app to launch
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Restore window state if requested and available
        if (restoreState && favorite.savedState) {
          try {
            await macosUtils.restoreWindowPositions(
              app.bundleId,
              favorite.savedState.windows
            );
          } catch (error) {
            warnings.push({
              code: 'state_not_restored',
              message: 'Failed to restore window positions',
            });
          }
        }

        return {
          success: true,
          method,
          warnings,
          error: null,
        };
      } catch (error) {
        return {
          success: false,
          method: 'app-only',
          warnings: [],
          error: {
            code: 'launch_failed',
            message: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
        };
      }
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
   * Save window state to a favorite
   */
  ipcMain.handle(
    'launcher:save-favorite-state',
    async (_event, favoriteId: string): Promise<SavedState> => {
      const favorite = favorites.get(favoriteId);
      if (!favorite) {
        throw new Error('Favorite not found');
      }

      const app = connectedApps.get(favorite.connectedAppId);
      if (!app) {
        throw new Error('Connected app not found');
      }

      // Check if app is running
      const isRunning = await macosUtils.isAppRunning(app.bundleId);
      if (!isRunning) {
        throw new Error(`${app.name} is not running`);
      }

      // Capture window state
      const windows = await macosUtils.captureWindowState(app.bundleId);

      const savedState: SavedState = {
        windows,
        capturedAt: new Date().toISOString(),
        capturedFromFile: favorite.launchConfig.filePath,
      };

      // Update favorite with saved state
      const updated = {
        ...favorite,
        savedState,
        updatedAt: new Date().toISOString(),
      };
      favorites.set(favoriteId, updated);

      return savedState;
    }
  );

  /**
   * Clear saved state from a favorite
   */
  ipcMain.handle('launcher:clear-favorite-state', async (_event, favoriteId: string): Promise<void> => {
    const favorite = favorites.get(favoriteId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    const updated = {
      ...favorite,
      savedState: null,
      updatedAt: new Date().toISOString(),
    };
    favorites.set(favoriteId, updated);
  });

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
}
