import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import { invoke } from '@tauri-apps/api/core';
import type {
  ConnectedApp,
  Favorite,
  RunningApp,
  LaunchResult,
  SavedState,
} from '@/types/launcher';

interface LauncherState {
  connectedApps: ConnectedApp[];
  favoritesByWorkspace: Record<string, Favorite[]>;
  runningApps: Set<string>; // bundle IDs
  isAddModalOpen: boolean;
  editingFavoriteId: string | null;
}

const { store } = await persist<LauncherState>(
  {
    connectedApps: [],
    favoritesByWorkspace: {},
    runningApps: new Set(),
    isAddModalOpen: false,
    editingFavoriteId: null,
  },
  'maestro-launcher',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const launcherStore = store;

export const launcherActions = {
  async loadConnectedApps() {
    // In a full implementation, this would fetch from IndexedDB
    // For now, we'll maintain them in-memory
  },

  async loadFavorites(workspaceId: string) {
    // In a full implementation, this would fetch from IndexedDB
    // For now, we'll maintain them in-memory
  },

  async registerApp(appPath: string): Promise<ConnectedApp> {
    const app = await invoke<ConnectedApp>('register_connected_app', {
      appPath,
    });

    // Check if app already exists
    const existingIndex = launcherStore.connectedApps.findIndex(
      (a) => a.bundleId === app.bundleId
    );

    if (existingIndex >= 0) {
      launcherStore.connectedApps[existingIndex] = app;
    } else {
      launcherStore.connectedApps.push(app);
    }

    return app;
  },

  async addFavorite(
    workspaceId: string,
    appPath: string,
    name: string,
    filePath: string | null = null,
    deepLink: string | null = null
  ) {
    // Register app if not already registered
    let connectedApp = launcherStore.connectedApps.find(
      (a) => a.path === appPath
    );

    if (!connectedApp) {
      connectedApp = await launcherActions.registerApp(appPath);
    }

    // Determine launch method
    let launchMethod: 'file' | 'deeplink' | 'app-only' = 'app-only';
    if (deepLink) {
      launchMethod = 'deeplink';
    } else if (filePath) {
      launchMethod = 'file';
    }

    // Create favorite
    const favorite: Favorite = {
      id: crypto.randomUUID(),
      workspaceId,
      connectedAppId: connectedApp.id,
      name,
      icon: null,
      color: null,
      position: launcherStore.favoritesByWorkspace[workspaceId]?.length || 0,
      launchConfig: {
        filePath,
        deepLink,
        launchMethod,
      },
      savedState: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!launcherStore.favoritesByWorkspace[workspaceId]) {
      launcherStore.favoritesByWorkspace[workspaceId] = [];
    }

    launcherStore.favoritesByWorkspace[workspaceId].push(favorite);

    return favorite;
  },

  async launchFavorite(favoriteId: string, restoreState: boolean = true) {
    const favorite = launcherActions.findFavorite(favoriteId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    const app = launcherStore.connectedApps.find(
      (a) => a.id === favorite.connectedAppId
    );
    if (!app) {
      throw new Error('Connected app not found');
    }

    const result = await invoke<LaunchResult>('launch_favorite_simple', {
      appPath: app.path,
      filePath: favorite.launchConfig.filePath,
      deepLink: favorite.launchConfig.deepLink,
      restoreState,
    });

    return result;
  },

  async updateRunningApps() {
    const apps = await invoke<RunningApp[]>('get_running_apps');
    launcherStore.runningApps = new Set(apps.map((a) => a.bundleId));
  },

  async bringAppToFront(bundleId: string) {
    await invoke('bring_app_to_front', { bundleId });
  },

  async checkAccessibilityPermission(): Promise<boolean> {
    return await invoke<boolean>('check_accessibility_permission');
  },

  async requestAccessibilityPermission(): Promise<boolean> {
    return await invoke<boolean>('request_accessibility_permission');
  },

  async saveState(favoriteId: string) {
    const favorite = launcherActions.findFavorite(favoriteId);
    if (!favorite) {
      throw new Error('Favorite not found');
    }

    const app = launcherStore.connectedApps.find(
      (a) => a.id === favorite.connectedAppId
    );
    if (!app) {
      throw new Error('Connected app not found');
    }

    const state = await invoke<SavedState>('capture_window_state', {
      bundleId: app.bundleId,
    });

    favorite.savedState = state;
    favorite.updatedAt = new Date().toISOString();
  },

  clearState(favoriteId: string) {
    const favorite = launcherActions.findFavorite(favoriteId);
    if (favorite) {
      favorite.savedState = null;
      favorite.updatedAt = new Date().toISOString();
    }
  },

  deleteFavorite(favoriteId: string) {
    for (const workspaceId in launcherStore.favoritesByWorkspace) {
      const index = launcherStore.favoritesByWorkspace[workspaceId].findIndex(
        (f) => f.id === favoriteId
      );
      if (index >= 0) {
        launcherStore.favoritesByWorkspace[workspaceId].splice(index, 1);
        break;
      }
    }
  },

  updateFavorite(favoriteId: string, updates: Partial<Favorite>) {
    const favorite = launcherActions.findFavorite(favoriteId);
    if (favorite) {
      Object.assign(favorite, updates);
      favorite.updatedAt = new Date().toISOString();
    }
  },

  findFavorite(favoriteId: string): Favorite | undefined {
    for (const workspaceId in launcherStore.favoritesByWorkspace) {
      const favorite = launcherStore.favoritesByWorkspace[workspaceId].find(
        (f) => f.id === favoriteId
      );
      if (favorite) {
        return favorite;
      }
    }
    return undefined;
  },

  getConnectedApp(appId: string): ConnectedApp | undefined {
    return launcherStore.connectedApps.find((a) => a.id === appId);
  },

  reorderFavorites(workspaceId: string, favoriteIds: string[]) {
    const favorites = launcherStore.favoritesByWorkspace[workspaceId];
    if (!favorites) return;

    const reordered = favoriteIds
      .map((id) => favorites.find((f) => f.id === id))
      .filter((f): f is Favorite => f !== undefined);

    reordered.forEach((favorite, index) => {
      favorite.position = index;
    });

    launcherStore.favoritesByWorkspace[workspaceId] = reordered;
  },
};

// Poll for running apps every 2 seconds
setInterval(() => {
  launcherActions.updateRunningApps().catch(console.error);
}, 2000);

// Initial update
launcherActions.updateRunningApps().catch(console.error);
