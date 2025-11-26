/**
 * Happy Coder Store
 *
 * Manages Happy Coder (mobile companion) integration settings.
 * Happy provides E2E encrypted sync between desktop and mobile for Claude Code sessions.
 *
 * @see https://github.com/23c/happy-cli
 */

import { useSnapshot } from 'valtio';
import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

// =============================================================================
// Types
// =============================================================================

export interface HappySettings {
  /** Enable Happy Coder for mobile access to agent sessions */
  enabled: boolean;
  /** Custom relay server URL (default: Happy's public relay) */
  serverUrl?: string;
  /** Custom web app URL for QR pairing */
  webappUrl?: string;
  /** Whether to show QR code on agent start */
  showQrOnStart: boolean;
  /** Track metadata to pass to Happy (visible in mobile app) */
  sendTrackMetadata: boolean;
}

export interface HappyConnectionStatus {
  /** Whether happy-coder CLI is installed */
  isInstalled: boolean;
  /** Detected happy-coder version */
  version?: string;
  /** Whether currently connected to relay */
  isConnected: boolean;
  /** Number of active sessions using Happy */
  activeHappySessions: number;
  /** Last check timestamp */
  lastChecked?: string;
  /** Error message if detection failed */
  error?: string;
}

interface HappyState {
  settings: HappySettings;
  status: HappyConnectionStatus;
}

// =============================================================================
// Defaults
// =============================================================================

export const DEFAULT_HAPPY_SETTINGS: HappySettings = {
  enabled: true,
  showQrOnStart: true,
  sendTrackMetadata: true,
  // Use Happy's default public relay
  serverUrl: undefined,
  webappUrl: undefined,
};

const DEFAULT_STATUS: HappyConnectionStatus = {
  isInstalled: false,
  isConnected: false,
  activeHappySessions: 0,
};

// =============================================================================
// Store
// =============================================================================

const { store } = await persist<HappyState>(
  {
    settings: DEFAULT_HAPPY_SETTINGS,
    status: DEFAULT_STATUS,
  },
  'maestro-happy',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 500,
    // Don't persist status, only settings
    omit: ['status'],
  }
);

export const happyStore = store;

// =============================================================================
// Hooks
// =============================================================================

export function useHappyStore() {
  return useSnapshot(happyStore);
}

export function useHappySettings() {
  const snap = useSnapshot(happyStore);
  return snap.settings;
}

export function useHappyStatus() {
  const snap = useSnapshot(happyStore);
  return snap.status;
}

// =============================================================================
// Actions
// =============================================================================

export const happyActions = {
  /**
   * Update Happy settings
   */
  updateSettings: (settings: Partial<HappySettings>): void => {
    happyStore.settings = {
      ...happyStore.settings,
      ...settings,
    };
  },

  /**
   * Toggle Happy Coder on/off
   */
  toggleEnabled: (): void => {
    happyStore.settings.enabled = !happyStore.settings.enabled;
  },

  /**
   * Update connection status (called from main process)
   */
  updateStatus: (status: Partial<HappyConnectionStatus>): void => {
    happyStore.status = {
      ...happyStore.status,
      ...status,
      lastChecked: new Date().toISOString(),
    };
  },

  /**
   * Increment active Happy sessions count
   */
  incrementActiveSessions: (): void => {
    happyStore.status.activeHappySessions++;
  },

  /**
   * Decrement active Happy sessions count
   */
  decrementActiveSessions: (): void => {
    happyStore.status.activeHappySessions = Math.max(
      0,
      happyStore.status.activeHappySessions - 1
    );
  },

  /**
   * Reset to defaults
   */
  resetSettings: (): void => {
    happyStore.settings = DEFAULT_HAPPY_SETTINGS;
  },
};
