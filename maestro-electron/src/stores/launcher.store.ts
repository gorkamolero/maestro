import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type {
  ConnectedApp,
  Favorite,
  RunningApp,
  LaunchResult,
  SavedState,
} from '../types/launcher';

// Electron IPC helper
const invoke = (channel: string, ...args: unknown[]) => {
  return window.electron.invoke(channel, ...args);
};

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
    omit: ['isAddModalOpen', 'editingFavoriteId'], // Don't persist UI state
  }
);

export const launcherStore = store;

export const launcherActions = {
  async loadConnectedApps() {
    const apps = await invoke('launcher:get-connected-apps') as ConnectedApp[];
    launcherStore.connectedApps = apps;
  },

  async loadFavorites(workspaceId: string) {
    const favorites = await invoke('launcher:get-favorites', workspaceId) as Favorite[];
    launcherStore.favoritesByWorkspace[workspaceId] = favorites;
  },

  async registerApp(appPath: string): Promise<ConnectedApp> {
    const app = await invoke('launcher:register-app', appPath) as ConnectedApp;

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

    // Create favorite via IPC
    const favorite = await invoke('launcher:create-favorite', {
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
    }) as Favorite;

    if (!launcherStore.favoritesByWorkspace[workspaceId]) {
      launcherStore.favoritesByWorkspace[workspaceId] = [];
    }

    launcherStore.favoritesByWorkspace[workspaceId].push(favorite);

    return favorite;
  },

  async launchFavorite(favoriteId: string, restoreState = true) {
    const result = await invoke('launcher:launch-favorite', favoriteId, restoreState) as LaunchResult;
    return result;
  },

  async updateRunningApps() {
    const apps = await invoke('launcher:get-running-apps') as RunningApp[];
    launcherStore.runningApps = new Set(apps.map((a) => a.bundleId));
  },

  async bringAppToFront(bundleId: string) {
    await invoke('launcher:bring-to-front', bundleId);
  },

  async saveState(favoriteId: string) {
    const state = await invoke('launcher:save-favorite-state', favoriteId) as SavedState;

    const favorite = launcherActions.findFavorite(favoriteId);
    if (favorite) {
      favorite.savedState = state;
      favorite.updatedAt = new Date().toISOString();
    }

    return state;
  },

  async clearState(favoriteId: string) {
    await invoke('launcher:clear-favorite-state', favoriteId);

    const favorite = launcherActions.findFavorite(favoriteId);
    if (favorite) {
      favorite.savedState = null;
      favorite.updatedAt = new Date().toISOString();
    }
  },

  async deleteFavorite(favoriteId: string) {
    await invoke('launcher:delete-favorite', favoriteId);

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

  async updateFavorite(favoriteId: string, updates: Partial<Favorite>) {
    const updated = await invoke('launcher:update-favorite', { favoriteId, updates }) as Favorite;

    const favorite = launcherActions.findFavorite(favoriteId);
    if (favorite) {
      Object.assign(favorite, updated);
    }

    return updated;
  },

  async pickApp(): Promise<string | null> {
    return await invoke('launcher:pick-app') as string | null;
  },

  async pickFile(appId: string): Promise<string | null> {
    return await invoke('launcher:pick-file', appId) as string | null;
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
