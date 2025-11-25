import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type {
  ConnectedApp,
  RunningApp,
} from '../types/launcher';

// Electron IPC helper
const invoke = (channel: string, ...args: unknown[]) => {
  return window.electron.invoke(channel, ...args);
};

interface LauncherState {
  connectedApps: ConnectedApp[];
  runningApps: Set<string>; // bundle IDs
  isAddModalOpen: boolean;
}

const { store } = await persist<LauncherState>(
  {
    connectedApps: [],
    runningApps: new Set(),
    isAddModalOpen: false,
  },
  'maestro-launcher',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
    omit: ['isAddModalOpen'], // Don't persist UI state
  }
);

export const launcherStore = store;

export const launcherActions = {
  async loadConnectedApps() {
    const apps = await invoke('launcher:get-connected-apps') as ConnectedApp[];
    launcherStore.connectedApps = apps;
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

  async launchApp(connectedAppId: string, launchConfig: { filePath: string | null; deepLink: string | null; launchMethod: 'file' | 'deeplink' | 'app-only' }) {
    const connectedApp = launcherActions.getConnectedApp(connectedAppId);
    if (!connectedApp) {
      throw new Error(`Connected app not found: ${connectedAppId}`);
    }

    try {
      // Use macOS utilities directly via IPC
      if (launchConfig.deepLink) {
        await invoke('launcher:launch-deeplink', launchConfig.deepLink);
      } else if (launchConfig.filePath) {
        await invoke('launcher:launch-with-file', connectedApp.path, launchConfig.filePath);
      } else {
        await invoke('launcher:launch-app-only', connectedApp.path);
      }

      // Update running apps list
      await launcherActions.updateRunningApps();

      return {
        success: true,
        method: launchConfig.launchMethod,
        warnings: [],
        error: null,
      } as LaunchResult;
    } catch (error) {
      return {
        success: false,
        method: launchConfig.launchMethod,
        warnings: [],
        error: {
          code: 'launch_failed',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      } as LaunchResult;
    }
  },

  async updateRunningApps() {
    const apps = await invoke('launcher:get-running-apps') as RunningApp[];
    launcherStore.runningApps = new Set(apps.map((a) => a.bundleId));
  },

  async bringAppToFront(bundleId: string) {
    await invoke('launcher:bring-to-front', bundleId);
  },

  async pickApp(): Promise<string | null> {
    return await invoke('launcher:pick-app') as string | null;
  },

  async pickFile(appId: string): Promise<string | null> {
    return await invoke('launcher:pick-file', appId) as string | null;
  },

  getConnectedApp(appId: string): ConnectedApp | undefined {
    return launcherStore.connectedApps.find((a) => a.id === appId);
  },

  async getInstalledApps(): Promise<Array<{ name: string; path: string; bundleId: string | null; icon: string | null }>> {
    return await invoke('launcher:get-installed-apps') as Array<{ name: string; path: string; bundleId: string | null; icon: string | null }>;
  },
};

// Poll for running apps every 2 seconds
setInterval(() => {
  launcherActions.updateRunningApps().catch(console.error);
}, 2000);

// Initial update
launcherActions.updateRunningApps().catch(console.error);
