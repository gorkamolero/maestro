import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import invariant from 'tiny-invariant';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Tab } from '@/stores/workspace.store';
import { TabDropZone as ZoneType, TabDragData } from '@/types';
import { DraggableTab } from './DraggableTab';

interface TabDropZoneProps {
  zone: ZoneType;
  tabs: Tab[];
  spaceId: string;
  title: string;
  emptyMessage?: string;
  onDrop?: (data: TabDragData, targetIndex: number) => void;
}

export function TabDropZone({
  zone,
  tabs,
  spaceId,
  title,
  emptyMessage = 'No items yet',
}: TabDropZoneProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  // Setup drop target
  useEffect(() => {
    const element = dropZoneRef.current;
    invariant(element);

    return dropTargetForElements({
      element,
      getData: () => ({
        zoneType: zone,
        spaceId,
      } as Record<string, unknown>),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false),
      canDrop: ({ source }) => {
        // Only accept tab drags
        const data = source.data as unknown as TabDragData;
        return data.type === 'tab';
      },
    });
  }, [zone, spaceId]);

  return (
    <div ref={dropZoneRef} className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
      </div>

      {/* Drop zone highlight */}
      {isDraggedOver && (
        <motion.div
          layoutId={`dropzone-${zone}`}
          className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Tabs List */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {tabs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-2 py-4 text-center text-sm text-white/40"
            >
              {emptyMessage}
            </motion.div>
          ) : (
            tabs.map((tab, index) => (
              <DraggableTab
                key={tab.id}
                tab={tab}
                zone={zone}
                index={index}
                spaceId={spaceId}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
