import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Tab, type TabsViewMode } from '@/stores/workspace.store';
import { DraggableTab } from './DraggableTab';
import { FavoritesGrid } from './FavoritesGrid';

interface TabDropZoneProps {
  tabs: Tab[];
  spaceId: string;
  viewMode: TabsViewMode;
  emptyMessage?: string;
}

export function TabDropZone({
  tabs,
  spaceId,
  viewMode,
  emptyMessage = 'No tabs yet',
}: TabDropZoneProps) {
  // All drag logic is now handled by the parent DndContext in DraggableWorkspace.tsx
  // This component just renders the sortable items and provides a droppable zone
  const { setNodeRef, isOver } = useDroppable({
    id: 'tabs',
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
      {/* Drop zone highlight */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none z-10" />
      )}

      {/* Reorderable List or Grid */}
      {tabs.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-white/40 rounded-lg">
          {emptyMessage}
        </div>
      ) : viewMode === 'grid' ? (
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

