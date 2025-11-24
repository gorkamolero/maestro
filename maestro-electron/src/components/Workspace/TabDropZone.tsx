import { Reorder } from 'motion/react';
import { useRef } from 'react';
import { Tab, workspaceActions, workspaceStore } from '@/stores/workspace.store';
import { TabDropZone as ZoneType } from '@/types';
import { DraggableTab } from './DraggableTab';
import type { Favorite, ConnectedApp } from '@/types/launcher';
import { useCrossZoneDrag } from './CrossZoneDragContext';
import { cn } from '@/lib/utils';
import { launcherActions } from '@/stores/launcher.store';
import { FavoritesGrid } from './FavoritesGrid';

interface TabDropZoneProps {
  zone: ZoneType;
  tabs: Tab[];
  spaceId: string;
  title: string;
  emptyMessage?: string;
  appFavorites?: Favorite[];
  getConnectedApp?: (appId: string) => ConnectedApp | undefined;
}

type ReorderItem = (Tab & { itemType: 'tab' }) | (Favorite & { itemType: 'app' });

export function TabDropZone({
  zone,
  tabs,
  spaceId,
  title,
  emptyMessage = 'No items yet',
  appFavorites = [],
  getConnectedApp,
}: TabDropZoneProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const { draggedTab, sourceZone, hoveredZone, setHoveredZone} = useCrossZoneDrag();


  const handlePointerEnter = () => {
    if (draggedTab && sourceZone !== zone) {
      setHoveredZone(zone);
    }
  };

  const handlePointerLeave = () => {
    if (draggedTab) {
      setHoveredZone(null);
    }
  };

  const handleDrop = () => {
    if (draggedTab && sourceZone && sourceZone !== zone) {
      // Move tab to this zone
      workspaceActions.moveTabToZone(draggedTab.id, zone, 0);
    }
  };

  const isHighlighted = draggedTab && hoveredZone === zone && sourceZone !== zone;

  const handleFavoritesReorder = (newOrder: ReorderItem[]) => {
    if (draggedTab && sourceZone !== zone) {
      return;
    }

    // Extract tab IDs and app favorite IDs from the new order
    const newTabOrder: Tab[] = [];
    const newAppFavoriteIds: string[] = [];

    newOrder.forEach(item => {
      if (item.itemType === 'tab') {
        newTabOrder.push(item as Tab & { itemType: 'tab' });
      } else {
        newAppFavoriteIds.push(item.id);
      }
    });

    // Reorder tabs - directly manipulate the store
    const nonFavoriteTabs = workspaceStore.tabs.filter(t => !t.isFavorite && t.spaceId === spaceId);
    const otherSpaceTabs = workspaceStore.tabs.filter(t => t.spaceId !== spaceId);
    workspaceStore.tabs = [...newTabOrder, ...nonFavoriteTabs, ...otherSpaceTabs];

    // Reorder app favorites in launcher store
    if (newAppFavoriteIds.length > 0) {
      launcherActions.reorderFavorites(spaceId, newAppFavoriteIds);
    }
  };

  const handleTabsReorder = (newOrder: Tab[]) => {
    if (draggedTab && sourceZone !== zone) {
      return;
    }

    // For tabs zone, directly set the new order
    const favoriteTabs = workspaceStore.tabs.filter(t => t.isFavorite && t.spaceId === spaceId);
    const otherSpaceTabs = workspaceStore.tabs.filter(t => t.spaceId !== spaceId);
    workspaceStore.tabs = [...favoriteTabs, ...newOrder, ...otherSpaceTabs];
  };

  return (
    <div
      ref={zoneRef}
      className="relative flex flex-col h-full"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-xs font-medium text-white/60">{title}</span>
      </div>

      {/* Drop zone highlight */}
      {isHighlighted && (
        <div className="absolute inset-0 border-2 border-blue-400/50 rounded-lg pointer-events-none z-10" />
      )}

      {/* Reorderable List */}
      {tabs.length === 0 && appFavorites.length === 0 ? (
        <div className={cn(
          "px-2 py-4 text-center text-sm text-white/40 rounded-lg transition-colors",
          isHighlighted && "bg-blue-400/10"
        )}>
          {emptyMessage}
        </div>
      ) : zone === 'favorites' ? (
        <FavoritesGrid
          tabs={tabs}
          spaceId={spaceId}
          appFavorites={appFavorites}
          getConnectedApp={getConnectedApp}
          onReorder={handleFavoritesReorder}
        />
      ) : (
        <Reorder.Group
          axis="y"
          values={tabs}
          onReorder={handleTabsReorder}
          className="space-y-1"
          style={{ listStyle: 'none', padding: 0, margin: 0 }}
          as="div"
        >
          {tabs.map((tab, index) => (
            <DraggableTab
              key={tab.id}
              tab={tab}
              zone={zone}
              index={index}
              spaceId={spaceId}
            />
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

