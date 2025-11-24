import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { Space, Segment } from '@/types';
import { SPACE_COLOR_PALETTE } from '@/types';

interface SpacesState {
  spaces: Space[];
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: spacesHistory } = await persistWithHistory<SpacesState>(
  {
    spaces: [],
  },
  'maestro-spaces',
  {
    debounceTime: 1000,
  }
);

// Migrate old spaces that have `color` instead of `primaryColor`/`secondaryColor`
const migrateSpaceColors = () => {
  const store = spacesHistory.value;
  let needsMigration = false;

  store.spaces.forEach((space, index) => {
    // Check if space has old `color` field but not new color fields
    const spaceAny = space as Space & { color?: string };
    if (spaceAny.color && !space.primaryColor) {
      needsMigration = true;
      const palette = SPACE_COLOR_PALETTE[index % SPACE_COLOR_PALETTE.length];
      space.primaryColor = palette.primary;
      space.secondaryColor = palette.secondary;
      delete spaceAny.color;
    }
  });

  if (needsMigration) {
    spacesHistory.saveHistory();
  }
};

// Run migration on load
migrateSpaceColors();

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
  addSpace: (name: string): Space => {
    const store = getSpacesStore();
    const colorPair = getNextColorPair();
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      position: store.spaces.length,
      primaryColor: colorPair.primary,
      secondaryColor: colorPair.secondary,
      segments: [],
      markers: [],
    };
    store.spaces.push(newSpace);
    return newSpace;
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
};
