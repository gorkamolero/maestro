import { useSnapshot } from 'valtio';
import { useReactFlow } from '@xyflow/react';
import { timelineStore } from '@/stores/timeline.store';
import { timeToPixels } from '@/lib/timeline-utils';

interface NowLineProps {
  referenceTime: Date;
}

/**
 * NowLine component - renders in viewport coordinates, spans full height
 */
export function NowLine({ referenceTime }: NowLineProps) {
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { getViewport } = useReactFlow();
  const viewport = getViewport();

  // Calculate canvas X position
  const canvasX = timeToPixels(now, zoomLevel, referenceTime);

  // Convert to viewport X position
  const viewportX = canvasX * viewport.zoom + viewport.x;

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
      style={{
        left: `${viewportX}px`,
        boxShadow: '0 0 10px hsl(var(--primary))',
        zIndex: 1000,
      }}
    >
      <div className="absolute top-0 -left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-background rounded-full" />
      </div>
      <div className="absolute top-6 left-2 text-xs font-mono text-primary whitespace-nowrap">
        NOW
      </div>
    </div>
  );
}
