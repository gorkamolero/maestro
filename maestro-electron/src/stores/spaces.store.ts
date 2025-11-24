import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { Space, Segment } from '@/types';

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

export { spacesHistory };

// Getter that always returns current value (important after undo/redo which replaces .value)
export const getSpacesStore = () => spacesHistory.value;

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
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      position: store.spaces.length,
      color: '#64748b', // slate-500
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
