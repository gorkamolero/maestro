import { useSnapshot } from 'valtio';
import { useReactFlow } from '@xyflow/react';
import { timelineStore } from '@/stores/timeline.store';
import { spacesStore } from '@/stores/spaces.store';
import { segmentsActions } from '@/stores/segments.store';
import { spacesActions } from '@/stores/spaces.store';
import { timeToPixels } from '@/lib/timeline-utils';
import { CreateSegmentMenu } from './CreateSegmentMenu';
import type { SegmentType } from '@/types';

interface NowLineProps {
  referenceTime: Date;
}

/**
 * NowLine component - renders in viewport coordinates, spans full height
 * Right-click to create a new segment at NOW
 */
export function NowLine({ referenceTime }: NowLineProps) {
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { spaces } = useSnapshot(spacesStore);
  const { getViewport } = useReactFlow();
  const viewport = getViewport();

  // Calculate canvas X position
  const canvasX = timeToPixels(now, zoomLevel, referenceTime);

  // Convert to viewport X position
  const viewportX = canvasX * viewport.zoom + viewport.x;

  const handleCreateSegment = (type: SegmentType) => {
    // If no spaces exist, create one first
    if (spaces.length === 0) {
      spacesActions.addSpace('Main Space');
    }

    // Create segment on the first track
    const space = spaces[0];
    const segment = segmentsActions.createSegment(space.id, `New ${type}`, type);

    // Add segment to track
    spacesActions.addSegment(space.id, segment);
  };

  return (
    <CreateSegmentMenu onCreateSegment={handleCreateSegment}>
      <div
        className="absolute top-0 bottom-0 w-2 bg-primary/20 hover:bg-primary/30 cursor-context-menu"
        style={{
          left: `${viewportX - 4}px`, // Center the clickable area
          zIndex: 1000,
        }}
      >
        <div
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary pointer-events-none"
          style={{
            boxShadow: '0 0 10px hsl(var(--primary))',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -ml-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center pointer-events-none">
          <div className="w-2 h-2 bg-background rounded-full" />
        </div>
        <div className="absolute top-6 left-1/2 ml-2 text-xs font-mono text-primary whitespace-nowrap pointer-events-none">
          NOW
        </div>
      </div>
    </CreateSegmentMenu>
  );
}
