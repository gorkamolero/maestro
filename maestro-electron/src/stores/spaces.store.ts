import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import { proxyWithHistory } from 'valtio-history';
import { proxy } from 'valtio';
import type { Space, Segment } from '@/types';

interface SpacesState {
  spaces: Space[];
}

// Create proxy with history tracking
export const spacesHistory = proxyWithHistory({
  spaces: [],
});

// Then apply persistence to the .value (the actual state)
const { store } = await persist<SpacesState>(
  spacesHistory.value,
  'maestro-spaces',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const spacesStore = store;

export const spacesActions = {
  addSpace: (name: string): Space => {
    const newSpace: Space = {
      id: crypto.randomUUID(),
      name,
      position: spacesStore.spaces.length,
      color: '#64748b', // slate-500
      segments: [],
      markers: [],
    };
    spacesStore.spaces.push(newSpace);
    return newSpace;
  },

  removeSpace: (spaceId: string) => {
    spacesStore.spaces = spacesStore.spaces.filter((t) => t.id !== spaceId);
  },

  updateSpace: (spaceId: string, updates: Partial<Space>) => {
    const index = spacesStore.spaces.findIndex((t) => t.id === spaceId);
    if (index !== -1) {
      spacesStore.spaces[index] = { ...spacesStore.spaces[index], ...updates };
    }
  },

  reorderSpaces: (spaces: Space[]) => {
    spacesStore.spaces = spaces;
  },

  addSegment: (spaceId: string, segment: Segment) => {
    const space = spacesStore.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments.push(segment);
    }
  },

  removeSegment: (spaceId: string, segmentId: string) => {
    const space = spacesStore.spaces.find((t) => t.id === spaceId);
    if (space) {
      space.segments = space.segments.filter((s) => s.id !== segmentId);
    }
  },

  updateSegment: (spaceId: string, segmentId: string, updates: Partial<Segment>) => {
    const space = spacesStore.spaces.find((t) => t.id === spaceId);
    if (space) {
      const index = space.segments.findIndex((s) => s.id === segmentId);
      if (index !== -1) {
        space.segments[index] = { ...space.segments[index], ...updates };
      }
    }
  },
};
