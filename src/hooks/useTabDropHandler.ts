import { useEffect, useCallback } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { TabDragData, DropZoneData } from '@/types';
import { workspaceActions } from '@/stores/workspace.store';

export function useTabDropHandler() {
  const handleDrop = useCallback(({ source, location }: any) => {
    const dragData = source.data as TabDragData;

    if (dragData.type !== 'tab') return;

    const dropTargets = location.current.dropTargets;
    if (dropTargets.length === 0) return;

    const targetData = dropTargets[0].data as DropZoneData;
    const { tabId, sourceZone } = dragData;
    const { zoneType: targetZone } = targetData;

    // Calculate drop index (simplified - default to beginning of zone)
    const targetIndex = 0;

    if (sourceZone === targetZone) {
      // Same zone reorder
      workspaceActions.reorderTabInZone(tabId, targetZone, targetIndex);
    } else {
      // Cross-zone move
      workspaceActions.moveTabToZone(tabId, targetZone, targetIndex);
    }
  }, []);

  useEffect(() => {
    return monitorForElements({
      onDrop: handleDrop,
    });
  }, [handleDrop]);
}
