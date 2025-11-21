import { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore } from '@/stores/timeline.store';
import { timeToPixels, getPixelsPerMinute } from '@/lib/timeline-utils';
import type { ZoomLevel } from '@/types';

interface TimeRulerProps {
  referenceTime: Date;
}

// Time intervals for each zoom level (in minutes)
const TIME_INTERVALS: Record<ZoomLevel, number> = {
  hour: 60,      // Every hour
  day: 360,      // Every 6 hours
  week: 1440,    // Every day
  month: 10080,  // Every week
};

// Format time labels based on zoom level
function formatTimeLabel(date: Date, zoomLevel: ZoomLevel): string {
  switch (zoomLevel) {
    case 'hour':
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    case 'day':
      return date.toLocaleTimeString('en-US', { hour: 'numeric' });
    case 'week':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * TimeRuler component - renders in viewport coordinates, sticks to top
 */
export function TimeRuler({ referenceTime }: TimeRulerProps) {
  const { zoomLevel, viewportWidth } = useSnapshot(timelineStore);
  const { getViewport } = useReactFlow();
  const viewport = getViewport();

  const timeMarkers = useMemo(() => {
    if (!viewportWidth) return [];

    const interval = TIME_INTERVALS[zoomLevel];
    const markers: { canvasX: number; viewportX: number; label: string }[] = [];

    // Calculate visible time range based on viewport
    const visibleStartX = -viewport.x / viewport.zoom;
    const visibleEndX = (viewportWidth - viewport.x) / viewport.zoom;

    // Convert to minutes
    const pixelsPerMinute = getPixelsPerMinute(zoomLevel);
    const startMinutes = Math.floor((visibleStartX / pixelsPerMinute) / interval) * interval;
    const endMinutes = Math.ceil((visibleEndX / pixelsPerMinute) / interval) * interval;

    // Generate markers at intervals
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += interval) {
      const markerTime = new Date(referenceTime.getTime() + minutes * 60000);
      const canvasX = timeToPixels(markerTime, zoomLevel, referenceTime);
      const viewportX = canvasX * viewport.zoom + viewport.x;

      // Only include markers that are within viewport bounds
      if (viewportX >= -50 && viewportX <= viewportWidth + 50) {
        markers.push({
          canvasX,
          viewportX,
          label: formatTimeLabel(markerTime, zoomLevel),
        });
      }
    }

    return markers;
  }, [referenceTime, zoomLevel, viewportWidth, viewport.x, viewport.zoom]);

  return (
    <div className="absolute top-0 left-0 right-0 h-6 border-b border-border/50 bg-background/95 backdrop-blur-sm pointer-events-none z-[999]">
      {timeMarkers.map((marker, i) => (
        <div
          key={i}
          className="absolute top-0 h-full flex items-center"
          style={{ left: `${marker.viewportX}px` }}
        >
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
            {marker.label}
          </span>
        </div>
      ))}
    </div>
  );
}
