import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import type { Node } from '@xyflow/react';
import { timelineStore } from '@/stores/timeline.store';
import { spacesStore } from '@/stores/spaces.store';
import { timeToPixels, getSegmentWidth, TRACK_HEIGHT } from '@/lib/timeline-utils';

/**
 * Hook to convert spaces and segments into React Flow nodes
 */
export function useTimelineNodes(referenceTime: Date, trackLabelOffset: number): Node[] {
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { spaces } = useSnapshot(spacesStore);

  return useMemo(() => {
    const trackLabelNodes = spaces.map((space) => ({
      id: `space-label-${space.id}`,
      type: 'trackLabel',
      position: {
        x: trackLabelOffset + 20, // Stick to left edge with padding
        y: space.position * TRACK_HEIGHT,
      },
      data: {
        spaceId: space.id,
        name: space.name,
        color: space.color,
        segmentCount: space.segments.length,
      },
      draggable: false,
    }));

    const segmentNodes = spaces.flatMap((space) =>
      space.segments.map((segment) => {
        const xPos = timeToPixels(segment.startTime, zoomLevel, referenceTime);
        const width = getSegmentWidth(
          segment.startTime,
          segment.endTime,
          zoomLevel,
          referenceTime,
          now
        );

        return {
          id: segment.id,
          type: 'segment',
          position: {
            x: xPos,
            y: space.position * TRACK_HEIGHT,
          },
          data: {
            segmentId: segment.id,
            spaceId: space.id,
            title: segment.title,
            type: segment.type,
            status: segment.status,
            width,
            startTime: segment.startTime,
            endTime: segment.endTime,
          },
          draggable: false,
        };
      })
    );

    return [...trackLabelNodes, ...segmentNodes];
  }, [spaces, zoomLevel, referenceTime, now, trackLabelOffset]);
}
