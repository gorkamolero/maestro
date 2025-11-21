import { useCallback, useState, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { spacesStore, spacesActions } from '@/stores/spaces.store';
import { segmentsActions } from '@/stores/segments.store';
import { timelineStore } from '@/stores/timeline.store';
import { pixelsToTime, TRACK_HEIGHT } from '@/lib/timeline-utils';
import type { Segment } from '@/types';

interface TimelineHandlersOptions {
  containerRef: RefObject<HTMLDivElement>;
  referenceTime: Date;
}

/**
 * Hook to manage all timeline event handlers
 */
export function useTimelineHandlers({ containerRef, referenceTime }: TimelineHandlersOptions) {
  const reactFlowInstance = useReactFlow();
  const { spaces } = useSnapshot(spacesStore);
  const { zoomLevel } = useSnapshot(timelineStore);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [trackLabelOffset, setTrackLabelOffset] = useState(0);

  // Empty handlers - we manage state externally via Valtio
  const onNodesChange = useCallback(() => {}, []);
  const onEdgesChange = useCallback(() => {}, []);

  // Handle node clicks - segments handle their own expansion now
  const onNodeClick = useCallback(() => {
    // Segments use Expandable component internally
  }, []);

  // Update space label offset to keep them at left edge
  const onMove = useCallback((event: any, viewport: any) => {
    setTrackLabelOffset(-viewport.x / viewport.zoom);
  }, []);

  // Click on canvas to create segment
  const onPaneClick = useCallback((event: any) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    // Get click position in viewport coordinates
    const viewport = reactFlowInstance.getViewport();
    const clickX = (event.clientX - bounds.left - viewport.x) / viewport.zoom;
    const clickY = (event.clientY - bounds.top - viewport.y) / viewport.zoom;

    // Convert X to time
    const clickTime = pixelsToTime(clickX, zoomLevel, referenceTime);

    // Convert Y to space index
    const trackIndex = Math.floor(clickY / TRACK_HEIGHT);
    if (trackIndex < 0 || trackIndex >= spaces.length) return;

    const space = spaces[trackIndex];

    // Create new segment at clicked time
    const segment = segmentsActions.createSegment(
      space.id,
      'New segment',
      'note' // Default to note type
    );

    // Override start time to clicked time
    segment.startTime = clickTime;

    spacesActions.addSegment(space.id, segment);
  }, [zoomLevel, referenceTime, spaces, containerRef, reactFlowInstance]);

  return {
    trackLabelOffset,
    selectedSegment,
    setSelectedSegment,
    onNodesChange,
    onEdgesChange,
    onNodeClick,
    onMove,
    onPaneClick,
  };
}
