import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type { Segment, SegmentType, SegmentConfig } from '@/types';

interface SegmentsState {
  activeSegments: Segment[];
  selectedSegmentId: string | null;
}

const { store } = await persist<SegmentsState>(
  {
    activeSegments: [],
    selectedSegmentId: null,
  },
  'maestro-segments',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
  }
);

export const segmentsStore = store;

export const segmentsActions = {
  createSegment: (
    spaceId: string,
    title: string,
    type: SegmentType,
    config: SegmentConfig = {}
  ): Segment => {
    const segment: Segment = {
      id: crypto.randomUUID(),
      spaceId,
      title,
      startTime: new Date(),
      type,
      status: 'active',
      config,
    };

    segmentsStore.activeSegments.push(segment);
    return segment;
  },

  endSegment: (segmentId: string) => {
    const segment = segmentsStore.activeSegments.find((s) => s.id === segmentId);
    if (segment) {
      segment.endTime = new Date();
      segment.status = 'completed';
      segmentsStore.activeSegments = segmentsStore.activeSegments.filter((s) => s.id !== segmentId);
    }
  },

  pauseSegment: (segmentId: string) => {
    const segment = segmentsStore.activeSegments.find((s) => s.id === segmentId);
    if (segment) {
      segment.status = 'paused';
    }
  },

  resumeSegment: (segmentId: string) => {
    const segment = segmentsStore.activeSegments.find((s) => s.id === segmentId);
    if (segment) {
      segment.status = 'active';
    }
  },

  selectSegment: (segmentId: string | null) => {
    segmentsStore.selectedSegmentId = segmentId;
  },

  updateSegmentConfig: (segmentId: string, config: Partial<SegmentConfig>) => {
    const segment = segmentsStore.activeSegments.find((s) => s.id === segmentId);
    if (segment) {
      segment.config = { ...segment.config, ...config };
    }
  },
};
