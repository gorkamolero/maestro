import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type { ZoomLevel } from '@/types';

type BackgroundVariant = 'lines' | 'dots';

interface TimelineState {
  now: Date;
  scrollPosition: number;
  zoomLevel: ZoomLevel;
  viewportWidth: number;
  viewportHeight: number;
  backgroundVariant: BackgroundVariant;
}

const { store } = await persist<TimelineState>(
  {
    now: new Date(),
    scrollPosition: 0,
    zoomLevel: 'day',
    viewportWidth: 0,
    viewportHeight: 0,
    backgroundVariant: 'lines',
  },
  'maestro-timeline',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const timelineStore = store;

export const timelineActions = {
  updateNow: () => {
    timelineStore.now = new Date();
  },

  setScrollPosition: (position: number) => {
    timelineStore.scrollPosition = position;
  },

  setZoomLevel: (level: ZoomLevel) => {
    timelineStore.zoomLevel = level;
  },

  setViewportSize: (width: number, height: number) => {
    timelineStore.viewportWidth = width;
    timelineStore.viewportHeight = height;
  },

  setBackgroundVariant: (variant: BackgroundVariant) => {
    timelineStore.backgroundVariant = variant;
  },

  toggleBackgroundVariant: () => {
    timelineStore.backgroundVariant =
      timelineStore.backgroundVariant === 'lines' ? 'dots' : 'lines';
  },

  jumpToNow: () => {
    timelineStore.scrollPosition = 0;
  },
};

// Update NOW every second
setInterval(() => {
  timelineActions.updateNow();
}, 1000);
