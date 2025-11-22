import { useEffect, useState } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Tab } from '@/stores/workspace.store';
import { TabDropZone, TabDragData, DropZoneData } from '@/types';

interface DragState {
  isDragging: boolean;
  draggedTab: Tab | null;
  currentZone: TabDropZone;
  cursorPosition: { x: number; y: number };
}

export function useTabDragMonitor() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedTab: null,
    currentZone: 'tabs',
    cursorPosition: { x: 0, y: 0 },
  });

  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source, location }) => {
        const data = source.data as unknown as TabDragData;
        if (data.type !== 'tab') return;

        setDragState({
          isDragging: true,
          draggedTab: data.tab as Tab,
          currentZone: data.sourceZone,
          cursorPosition: { x: location.current.input.clientX, y: location.current.input.clientY },
        });
      },

      onDrag: ({ location }) => {
        const dropTargets = location.current.dropTargets;
        let currentZone: TabDropZone = 'tabs';

        // Detect which zone we're over
        if (dropTargets.length > 0) {
          const dropData = dropTargets[0].data as unknown as DropZoneData;
          currentZone = dropData.zoneType;
        }

        setDragState((prev) => ({
          ...prev,
          currentZone,
          cursorPosition: { x: location.current.input.clientX, y: location.current.input.clientY },
        }));
      },

      onDrop: () => {
        setDragState({
          isDragging: false,
          draggedTab: null,
          currentZone: 'tabs',
          cursorPosition: { x: 0, y: 0 },
        });
      },
    });
  }, []);

  return dragState;
}
