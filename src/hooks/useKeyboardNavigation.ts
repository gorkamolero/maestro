import { useEffect, useCallback, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { timeToPixels, TRACK_HEIGHT } from '@/lib/timeline-utils';

interface KeyboardNavigationOptions {
  containerRef: RefObject<HTMLDivElement>;
  referenceTime: Date;
}

/**
 * Hook to handle keyboard navigation and viewport centering
 */
export function useKeyboardNavigation({ containerRef, referenceTime }: KeyboardNavigationOptions) {
  const reactFlowInstance = useReactFlow();
  const { now, zoomLevel } = useSnapshot(timelineStore);

  const centerOnNow = useCallback(() => {
    const nowX = timeToPixels(now, zoomLevel, referenceTime);
    const { width } = containerRef.current?.getBoundingClientRect() || { width: 1000 };

    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: reactFlowInstance.getViewport().y,
      zoom: reactFlowInstance.getViewport().zoom,
    }, { duration: 300 });
  }, [now, zoomLevel, referenceTime, reactFlowInstance, containerRef]);

  const centerOnTrack = useCallback((trackPosition: number) => {
    // Set zoom to default (day)
    timelineActions.setZoomLevel('day');

    // Calculate track Y position
    const trackY = trackPosition * TRACK_HEIGHT;
    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 800 };

    // Center on NOW horizontally and on track vertically
    const nowX = timeToPixels(now, 'day', referenceTime);

    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: -trackY + height / 2,
      zoom: 1,
    }, { duration: 300 });
  }, [now, referenceTime, reactFlowInstance, containerRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        centerOnNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerOnNow]);

  return { centerOnNow, centerOnTrack };
}
