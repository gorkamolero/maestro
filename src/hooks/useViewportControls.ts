import { useEffect, useCallback, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { tracksStore } from '@/stores/tracks.store';
import { timeToPixels, TRACK_HEIGHT } from '@/lib/timeline-utils';
import type { ZoomLevel } from '@/types';

interface ViewportControlsOptions {
  containerRef: RefObject<HTMLDivElement>;
  referenceTime: Date;
}

/**
 * Hook to handle viewport centering and keyboard navigation
 */
export function useViewportControls({ containerRef, referenceTime }: ViewportControlsOptions) {
  const reactFlowInstance = useReactFlow();
  const { now, zoomLevel } = useSnapshot(timelineStore);
  const { tracks } = useSnapshot(tracksStore);

  const centerOnNow = useCallback(() => {
    // Set zoom to default (day)
    timelineActions.setZoomLevel('day');

    const nowX = timeToPixels(now, 'day', referenceTime);
    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 800 };

    // Center on middle of all tracks vertically
    const totalTracksHeight = tracks.length * TRACK_HEIGHT;
    const middleY = totalTracksHeight / 2;

    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: -middleY + height / 2,
      zoom: 1,
    }, { duration: 300 });
  }, [now, referenceTime, reactFlowInstance, containerRef, tracks.length]);

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

  const changeZoomLevelAndCenter = useCallback((targetZoomLevel: ZoomLevel) => {
    // Calculate where NOW will be at the new zoom level
    const nowX = timeToPixels(now, targetZoomLevel, referenceTime);
    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 1000, height: 800 };
    const totalTracksHeight = tracks.length * TRACK_HEIGHT;
    const middleY = totalTracksHeight / 2;

    // Update zoom level and viewport position together
    timelineActions.setZoomLevel(targetZoomLevel);
    reactFlowInstance.setViewport({
      x: -nowX + width / 2,
      y: -middleY + height / 2,
      zoom: 1,
    });
  }, [now, referenceTime, reactFlowInstance, containerRef, tracks.length]);

  return { centerOnNow, centerOnTrack, changeZoomLevelAndCenter };
}
