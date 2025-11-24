import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Tab } from '@/stores/workspace.store';
import { TabDropZone as ZoneType } from '@/types';
import { DraggableTab } from './DraggableTab';
import { FavoritesGrid } from './FavoritesGrid';

interface TabDropZoneProps {
  zone: ZoneType;
  tabs: Tab[];
  spaceId: string;
  title: string;
  emptyMessage?: string;
}

export function TabDropZone({
  zone,
  tabs,
  spaceId,
  title,
  emptyMessage = 'No items yet',
}: TabDropZoneProps) {
  // All drag logic is now handled by the parent DndContext in DraggableWorkspace.tsx
  // This component just renders the sortable items and provides a droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: zone,
    data: {
      type: 'container',
      children: tabs.map(t => t.id),
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="relative flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
      </div>

      {/* Drop zone highlight */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none z-10" />
      )}

      {/* Reorderable List */}
      {tabs.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-white/40 rounded-lg">
          {emptyMessage}
        </div>
      ) : zone === 'favorites' ? (
        <FavoritesGrid
          tabs={tabs}
          spaceId={spaceId}
        />
      ) : (
        <SortableContext
          items={tabs.map(tab => tab.id)}
          strategy={verticalListSortingStrategy}
          id="tabs"
        >
          <div className="space-y-1">
            {tabs.map((tab, index) => (
              <DraggableTab
                key={tab.id}
                tab={tab}
                zone={zone}
                index={index}
                spaceId={spaceId}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

