import { useMemo } from 'react';
import { Panel } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore } from '@/stores/timeline.store';
import { timeToPixels } from '@/lib/timeline-utils';
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

export function TimeRuler({ referenceTime }: TimeRulerProps) {
  const { zoomLevel, viewportWidth } = useSnapshot(timelineStore);

  const timeMarkers = useMemo(() => {
    if (!viewportWidth) return [];

    const interval = TIME_INTERVALS[zoomLevel];
    const markers: { x: number; label: string; time: Date }[] = [];

    // Calculate visible time range (with padding)
    const minutesVisible = viewportWidth / (zoomLevel === 'hour' ? 2 : zoomLevel === 'day' ? 0.5 : zoomLevel === 'week' ? 0.1 : 0.025);
    const startMinutes = -minutesVisible;
    const endMinutes = minutesVisible * 2;

    // Generate markers at intervals
    for (let minutes = Math.floor(startMinutes / interval) * interval; minutes <= endMinutes; minutes += interval) {
      const markerTime = new Date(referenceTime.getTime() + minutes * 60000);
      const x = timeToPixels(markerTime, zoomLevel, referenceTime);

      markers.push({
        x,
        label: formatTimeLabel(markerTime, zoomLevel),
        time: markerTime,
      });
    }

    return markers;
  }, [referenceTime, zoomLevel, viewportWidth]);

  return (
    <Panel position="top-center" className="pointer-events-none w-full">
      <div className="relative h-8 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        {timeMarkers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${marker.x}px` }}
          >
            <div className="flex flex-col items-center">
              <div className="w-px h-2 bg-border" />
              <span className="text-[10px] font-mono text-muted-foreground mt-1 whitespace-nowrap">
                {marker.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
