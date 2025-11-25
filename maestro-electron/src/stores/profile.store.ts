/**
 * Profile Store
 *
 * Manages user profiles - the top-level organizational unit in Maestro.
 * Profiles isolate browser data, credentials, and settings.
 */

import { useSnapshot } from 'valtio';
import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type { Profile, ProfileSettings } from '@/types';
import { DEFAULT_PROFILE_SETTINGS, PROFILE_COLOR_PALETTE } from '@/types';

// =============================================================================
// State
// =============================================================================

interface ProfileState {
  profiles: Profile[];
  activeProfileId: string | null;
}

const { store } = await persist<ProfileState>(
  {
    profiles: [],
    activeProfileId: null,
  },
  'maestro-profiles',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 500,
  }
);

export const profileStore = store;

// =============================================================================
// Getters
// =============================================================================

export const getProfileStore = () => profileStore;

export const getActiveProfile = (): Profile | null => {
  const { profiles, activeProfileId } = profileStore;
  if (!activeProfileId) return null;
  return profiles.find(p => p.id === activeProfileId) || null;
};

export const getProfileById = (id: string): Profile | null => {
  return profileStore.profiles.find(p => p.id === id) || null;
};

// =============================================================================
// Hook
// =============================================================================

export function useProfileStore() {
  return useSnapshot(profileStore);
}

export function useActiveProfile(): Profile | null {
  const snap = useSnapshot(profileStore);
  if (!snap.activeProfileId) return null;
  return snap.profiles.find(p => p.id === snap.activeProfileId) || null;
}

// =============================================================================
// Actions
// =============================================================================

export const profileActions = {
  /**
   * Create a new profile
   */
  createProfile: (name: string, settings?: Partial<ProfileSettings>): Profile => {
    const colorIndex = profileStore.profiles.length % PROFILE_COLOR_PALETTE.length;

    const profile: Profile = {
      id: crypto.randomUUID(),
      name,
      color: PROFILE_COLOR_PALETTE[colorIndex],
      sessionPartition: `persist:profile-${crypto.randomUUID()}`,
      settings: {
        ...DEFAULT_PROFILE_SETTINGS,
        ...settings,
      },
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    profileStore.profiles.push(profile);

    // Auto-activate if it's the first profile
    if (profileStore.profiles.length === 1) {
      profileStore.activeProfileId = profile.id;
    }

    return profile;
  },

  /**
   * Update an existing profile
   */
  updateProfile: (profileId: string, updates: Partial<Omit<Profile, 'id' | 'sessionPartition' | 'createdAt'>>): void => {
    const index = profileStore.profiles.findIndex(p => p.id === profileId);
    if (index !== -1) {
      profileStore.profiles[index] = {
        ...profileStore.profiles[index],
        ...updates,
      };
    }
  },

  /**
   * Update profile settings
   */
  updateProfileSettings: (profileId: string, settings: Partial<ProfileSettings>): void => {
    const profile = profileStore.profiles.find(p => p.id === profileId);
    if (profile) {
      profile.settings = {
        ...profile.settings,
        ...settings,
      };
    }
  },

  /**
   * Delete a profile
   */
  deleteProfile: (profileId: string): void => {
    const index = profileStore.profiles.findIndex(p => p.id === profileId);
    if (index !== -1) {
      profileStore.profiles.splice(index, 1);

      // If deleting the active profile, switch to another
      if (profileStore.activeProfileId === profileId) {
        profileStore.activeProfileId = profileStore.profiles[0]?.id || null;
      }
    }
  },

  /**
   * Switch to a different profile
   */
  switchProfile: (profileId: string): void => {
    const profile = profileStore.profiles.find(p => p.id === profileId);
    if (profile) {
      profileStore.activeProfileId = profileId;
      profile.lastActiveAt = new Date().toISOString();
    }
  },

  /**
   * Get or create the default profile
   * Called on app startup to ensure there's always at least one profile
   */
  ensureDefaultProfile: (): Profile => {
    if (profileStore.profiles.length === 0) {
      return profileActions.createProfile('Personal');
    }

    // Ensure there's an active profile
    if (!profileStore.activeProfileId && profileStore.profiles.length > 0) {
      profileStore.activeProfileId = profileStore.profiles[0].id;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return getActiveProfile()!;
  },

  /**
   * Reorder profiles
   */
  reorderProfiles: (profiles: Profile[]): void => {
    profileStore.profiles = profiles;
  },
};

// =============================================================================
// Initialization
// =============================================================================

// Ensure default profile exists on load
// This runs after the store is hydrated from IndexedDB
setTimeout(() => {
  profileActions.ensureDefaultProfile();
}, 0);
