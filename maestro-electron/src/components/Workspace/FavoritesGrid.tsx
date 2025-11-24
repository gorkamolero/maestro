import SortableList, { SortableItem } from 'react-easy-sort';
import { arrayMoveImmutable } from 'array-move';
import { Tab, getWorkspaceStore } from '@/stores/workspace.store';
import { GridTab } from './GridTab';

interface FavoritesGridProps {
  tabs: Tab[];
  spaceId: string;
}

export function FavoritesGrid({ tabs, spaceId }: FavoritesGridProps) {
  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    // Reorder tabs array
    const newTabs = arrayMoveImmutable(tabs, oldIndex, newIndex);

    // Update store with new order
    const store = getWorkspaceStore();
    const allTabs = store.tabs.filter(t => t.spaceId !== spaceId);
    store.tabs = [...allTabs, ...newTabs];
  };

  return (
    <SortableList
      onSortEnd={handleSortEnd}
      className="flex flex-wrap gap-4 w-full"
      draggedItemClassName="opacity-50"
    >
      {tabs.map((tab) => (
        <SortableItem key={tab.id}>
          <div>
            <GridTab tab={tab} spaceId={spaceId} />
          </div>
        </SortableItem>
      ))}
    </SortableList>
  );
}
