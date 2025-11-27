import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { Space, Segment, SpaceContentMode } from '@/types';
import { SPACE_COLOR_PALETTE } from '@/types';

export type SpacesViewMode = 'cards' | 'panes';

interface SpacesState {
  spaces: Space[];
  viewMode: SpacesViewMode;
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: spacesHistory } = await persistWithHistory<SpacesState>(
  {
    spaces: [],
    viewMode: 'cards',
  },
  'maestro-spaces',
  {
    debounceTime: 1000,
  }
);

// Migrate old spaces
const migrateSpaces = () => {
  const store = spacesHistory.value;
  let needsMigration = false;

  store.spaces.forEach((space, index) => {
    // Migrate old `color` field to `primaryColor`/`secondaryColor`
    const spaceAny = space as Space & { color?: string };
    if (spaceAny.color && !space.primaryColor) {
      needsMigration = true;
      const palette = SPACE_COLOR_PALETTE[index % SPACE_COLOR_PALETTE.length];
      space.primaryColor = palette.primary;
      space.secondaryColor = palette.secondary;
      delete spaceAny.color;
    }

    // Add `next` field if missing
    if (space.next === undefined) {
      needsMigration = true;
      space.next = null;
    }

    // Add `lastActiveAt` field if missing
    if (space.lastActiveAt === undefined) {
      needsMigration = true;
      space.lastActiveAt = null;
    }
  });

  if (needsMigration) {
    spacesHistory.saveHistory();
  }
};

// Run migration on load
migrateSpaces();

export { spacesHistory };

// Getter that always returns current value (important after undo/redo which replaces .value)
export const getSpacesStore = () => spacesHistory.value;

/**
 * Get next color pair for a new space (cycles through palette)
 */
export const getNextColorPair = () => {
  const store = getSpacesStore();
  const index = store.spaces.length % SPACE_COLOR_PALETTE.length;
  return SPACE_COLOR_PALETTE[index];
};

/**
 * Hook to get reactive spaces state. Use this instead of useSnapshot(spacesStore).
 */
export function useSpacesStore() {
  const { value } = useSnapshot(spacesHistory);
  return value;
}

export const spacesActions = {
  addSpace: (name: string, profileId?: string): Space => {
    const store = getSpacesStore();
    const colorPair = getNextColorPair();
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      profileId,
      position: store.spaces.length,
      primaryColor: colorPair.primary,
      secondaryColor: colorPair.secondary,
      segments: [],
      markers: [],
      next: null,
      lastActiveAt: new Date().toISOString(),
    };
    store.spaces.push(newSpace);
    return newSpace;
  },

  /**
   * Assign a profile to a space
   */
  setSpaceProfile: (spaceId: string, profileId: string | undefined): void => {
    const store = getSpacesStore();
    const space = store.spaces.find(s => s.id === spaceId);
    if (space) {
      space.profileId = profileId;
    }
  },

  removeSpace: (spaceId: string) => {
    const store = getSpacesStore();
    store.spaces = store.spaces.filter((t) => t.id !== spaceId);
  },

  updateSpace: (spaceId: string, updates: Partial<Space>) => {
    const store = getSpacesStore();
    const index = store.spaces.findIndex((t) => t.id === spaceId);
    if (index !== -1) {
      store.spaces[index] = { ...store.spaces[index], ...updates };
    }
  },

  reorderSpaces: (spaces: Space[]) => {
    const store = getSpacesStore();
    store.spaces = spaces;
  },

  addSegment: (spaceId: string, segment: Segment) => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments.push(segment);
    }
  },

  removeSegment: (spaceId: string, segmentId: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments = space.segments.filter((s) => s.id !== segmentId);
    }
  },

  updateSegment: (spaceId: string, segmentId: string, updates: Partial<Segment>) => {
    const store = getSpacesStore();
    const space = store.spaces.find((t) => t.id === spaceId);
    if (space) {
      const index = space.segments.findIndex((s) => s.id === segmentId);
      if (index !== -1) {
        space.segments[index] = { ...space.segments[index], ...updates };
      }
    }
  },

  /**
   * Set the "what's next" text for a space
   */
  setSpaceNext: (spaceId: string, next: string | null) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.next = next;
    }
  },

  /**
   * Update the last active timestamp for a space
   */
  updateSpaceLastActive: (spaceId: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.lastActiveAt = new Date().toISOString();
    }
  },

  /**
   * Add a coding path to a space's recent paths (keeps last 5, most recent first)
   */
  addRecentCodingPath: (spaceId: string, path: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      const paths = space.recentCodingPaths || [];
      // Remove if already exists (will re-add at front)
      const filtered = paths.filter((p) => p !== path);
      // Add to front and keep max 5
      space.recentCodingPaths = [path, ...filtered].slice(0, 5);
    }
  },

  /**
   * Get recent coding paths for a space
   */
  getRecentCodingPaths: (spaceId: string): string[] => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    return space?.recentCodingPaths || [];
  },

  /**
   * Set the view mode for spaces (cards or panes)
   */
  setViewMode: (mode: SpacesViewMode) => {
    const store = getSpacesStore();
    store.viewMode = mode;
  },

  /**
   * Set the content mode for a space (tasks or notes)
   */
  setSpaceContentMode: (spaceId: string, mode: SpaceContentMode) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.contentMode = mode;
    }
  },

  /**
   * Update the notes content for a space
   */
  setSpaceNotesContent: (spaceId: string, content: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.notesContent = content;
    }
  },

  /**
   * Get the notes content for a space
   */
  getSpaceNotesContent: (spaceId: string): string | undefined => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    return space?.notesContent;
  },

  /**
   * Add a tag to a space
   */
  addTag: (spaceId: string, tagId: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      if (!space.tags) {
        space.tags = [];
      }
      if (!space.tags.includes(tagId)) {
        space.tags.push(tagId);
      }
    }
  },

  /**
   * Remove a tag from a space
   */
  removeTag: (spaceId: string, tagId: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space && space.tags) {
      space.tags = space.tags.filter((t) => t !== tagId);
    }
  },

  /**
   * Toggle a tag on a space
   */
  toggleTag: (spaceId: string, tagId: string) => {
    const store = getSpacesStore();
    const space = store.spaces.find((s) => s.id === spaceId);
    if (space) {
      if (!space.tags) {
        space.tags = [];
      }
      const index = space.tags.indexOf(tagId);
      if (index === -1) {
        space.tags.push(tagId);
      } else {
        space.tags.splice(index, 1);
      }
    }
  },
};
