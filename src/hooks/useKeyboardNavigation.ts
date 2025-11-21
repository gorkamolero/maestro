import { useEffect, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useSnapshot } from 'valtio';
import { timelineStore } from '@/stores/timeline.store';
import { timeToPixels } from '@/lib/timeline-utils';

interface KeyboardNavigationOptions {
  containerRef: RefObject<HTMLDivElement>;
  referenceTime: Date;
}

/**
 * Hook to handle keyboard navigation (space bar to center on NOW)
 */
export function useKeyboardNavigation({ containerRef, referenceTime }: KeyboardNavigationOptions) {
  const reactFlowInstance = useReactFlow();
  const { now, zoomLevel } = useSnapshot(timelineStore);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        const nowX = timeToPixels(now, zoomLevel, referenceTime);
        const { width } = containerRef.current?.getBoundingClientRect() || { width: 1000 };

        reactFlowInstance.setViewport({
          x: -nowX + width / 2,
          y: reactFlowInstance.getViewport().y,
          zoom: reactFlowInstance.getViewport().zoom,
        }, { duration: 300 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [now, zoomLevel, referenceTime, reactFlowInstance, containerRef]);
}
