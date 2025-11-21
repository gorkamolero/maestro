import { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import type { Node } from '@xyflow/react';
import { timelineStore } from '@/stores/timeline.store';
import { tracksStore } from '@/stores/tracks.store';
import { timeToPixels, getSegmentWidth, TRACK_HEIGHT } from '@/lib/timeline-utils';

/**
 * Hook to convert tracks and segments into React Flow nodes
 */
export function useTimelineNodes(referenceTime: Date, trackLabelOffset: number): Node[] {
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { tracks } = useSnapshot(tracksStore);

  return useMemo(() => {
    const trackLabelNodes = tracks.map((track) => ({
      id: `track-label-${track.id}`,
      type: 'trackLabel',
      position: {
        x: trackLabelOffset + 20, // Stick to left edge with padding
        y: track.position * TRACK_HEIGHT,
      },
      data: {
        trackId: track.id,
        name: track.name,
        color: track.color,
        segmentCount: track.segments.length,
      },
      draggable: false,
    }));

    const segmentNodes = tracks.flatMap((track) =>
      track.segments.map((segment) => {
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
            y: track.position * TRACK_HEIGHT,
          },
          data: {
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
  }, [tracks, zoomLevel, referenceTime, now, trackLabelOffset]);
}
