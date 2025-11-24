import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Tab } from '@/stores/workspace.store';
import { SortableGridTab } from './SortableGridTab';

interface FavoritesGridProps {
  tabs: Tab[];
  spaceId: string;
}

export function FavoritesGrid({ tabs, spaceId }: FavoritesGridProps) {
  return (
    <SortableContext
      items={tabs.map(tab => tab.id)}
      strategy={rectSortingStrategy}
      id="grid"
    >
      <div className="flex flex-wrap gap-4 w-full">
        {tabs.map((tab, index) => (
          <SortableGridTab
            key={tab.id}
            tab={tab}
            index={index}
            spaceId={spaceId}
          />
        ))}
      </div>
    </SortableContext>
  );
}
