import { useEffect, useRef, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { timeToPixels } from '@/lib/timeline-utils';

/**
 * Hook to manage timeline viewport sizing and initial centering on NOW
 */
export function useTimelineViewport() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const reactFlowInstance = useReactFlow();
  const { now, zoomLevel } = useSnapshot(timelineStore);

  // Reference time for the timeline (start of today)
  const referenceTime = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Handle viewport sizing and window resize
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      timelineActions.setViewportSize(width, height);
    }

    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        timelineActions.setViewportSize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center viewport on NOW when component mounts
  useEffect(() => {
    const nowX = timeToPixels(now, zoomLevel, referenceTime);
    const { width } = containerRef.current?.getBoundingClientRect() || { width: 1000 };

    // Position NOW line at center of viewport
    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: 0,
      zoom: 1,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, referenceTime };
}
