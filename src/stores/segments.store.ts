import { proxy } from 'valtio';
import type { Segment, SegmentType, SegmentConfig } from '@/types';

interface SegmentsState {
  activeSegments: Segment[];
  selectedSegmentId: string | null;
}

export const segmentsStore = proxy<SegmentsState>({
  activeSegments: [],
  selectedSegmentId: null,
});

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
