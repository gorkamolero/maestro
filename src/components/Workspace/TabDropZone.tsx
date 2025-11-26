import SortableList, { SortableItem } from 'react-easy-sort';
import { arrayMoveImmutable } from 'array-move';
import { Tab, type TabsViewMode, getWorkspaceStore } from '@/stores/workspace.store';
import { ListTab } from './ListTab';
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
  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    // Reorder tabs array
    const newTabs = arrayMoveImmutable(tabs, oldIndex, newIndex);

    // Update store with new order
    const store = getWorkspaceStore();
    const allTabs = store.tabs.filter(t => t.spaceId !== spaceId);
    store.tabs = [...allTabs, ...newTabs];
  };

  return (
    <div className="relative flex flex-col h-full">
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
        <SortableList
          onSortEnd={handleSortEnd}
          className="space-y-0.5"
          draggedItemClassName="opacity-50"
          lockAxis="y"
        >
          {tabs.map((tab) => (
            <SortableItem key={tab.id}>
              <div>
                <ListTab tab={tab} />
              </div>
            </SortableItem>
          ))}
        </SortableList>
      )}
    </div>
  );
}

