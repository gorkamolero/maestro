import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Tab, workspaceStore } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';
import type { Favorite, ConnectedApp } from '@/types/launcher';
import { SortableGridTab } from './SortableGridTab';
import { SortableGridAppFavorite } from './SortableGridAppFavorite';

type ReorderItem = (Tab & { itemType: 'tab' }) | (Favorite & { itemType: 'app' });

interface FavoritesGridProps {
  tabs: Tab[];
  spaceId: string;
  appFavorites: Favorite[];
  getConnectedApp?: (appId: string) => ConnectedApp | undefined;
  onReorder: (newOrder: ReorderItem[]) => void;
}

export function FavoritesGrid({ tabs, spaceId, appFavorites, getConnectedApp, onReorder }: FavoritesGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [localGridItems, setLocalGridItems] = useState<ReorderItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const items = [
      ...tabs.map(tab => ({ ...tab, itemType: 'tab' as const })),
      ...appFavorites.map(fav => ({ ...fav, itemType: 'app' as const }))
    ];
    setLocalGridItems(items);
  }, [tabs, appFavorites]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localGridItems.findIndex((item) => item.id === active.id);
    const newIndex = localGridItems.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(localGridItems, oldIndex, newIndex);
      setLocalGridItems(newOrder);
      onReorder(newOrder);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={localGridItems.map(item => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="flex flex-wrap gap-4 w-full">
          {localGridItems.map((item, index) => {
            if (item.itemType === 'tab') {
              return (
                <SortableGridTab
                  key={item.id}
                  item={item}
                  tab={item}
                  zone="favorites"
                  index={index}
                  spaceId={spaceId}
                />
              );
            } else {
              const app = getConnectedApp?.(item.connectedAppId);
              if (!app) return null;
              return (
                <SortableGridAppFavorite
                  key={item.id}
                  item={item}
                  favorite={item}
                  connectedApp={app}
                />
              );
            }
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
