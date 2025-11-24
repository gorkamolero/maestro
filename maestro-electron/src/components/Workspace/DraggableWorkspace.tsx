import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  CollisionDetection,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { TabDragGhost } from './TabDragGhost';
import type { Tab } from '@/stores/workspace.store';

interface DraggableWorkspaceProps {
  children: React.ReactNode;
  spaceId: string;
}

interface TabContainers {
  favorites: string[];
  tabs: string[];
}

export function DraggableWorkspace({ children, spaceId }: DraggableWorkspaceProps) {
  const { tabs } = useSnapshot(workspaceStore);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [hoveredZone, setHoveredZone] = useState<'favorites' | 'tabs' | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get tab IDs organized by container
  const items: TabContainers = {
    favorites: tabs.filter(t => t.isFavorite && t.spaceId === spaceId).map(t => t.id),
    tabs: tabs.filter(t => !t.isFavorite && t.spaceId === spaceId).map(t => t.id),
  };

  // Find which container a tab or app favorite belongs to
  const findContainer = useCallback((id: UniqueIdentifier): 'favorites' | 'tabs' | undefined => {
    if (id === 'favorites' || id === 'tabs') {
      return id as 'favorites' | 'tabs';
    }

    if (items.favorites.includes(id as string)) {
      return 'favorites';
    }
    if (items.tabs.includes(id as string)) {
      return 'tabs';
    }
    return undefined;
  }, [items]);

  // Custom collision detection strategy optimized for multiple containers
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const activeContainer = activeId ? findContainer(activeId) : null;

      // If dragging a container itself, use closestCenter for container reordering
      if (activeId && (activeId === 'favorites' || activeId === 'tabs')) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id === 'favorites' || container.id === 'tabs'
          ),
        });
      }

      // Start by finding any intersecting droppable with pointer
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);

      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        // If hovering over a container
        if (overId === 'favorites' || overId === 'tabs') {
          const containerItems = items[overId];

          // If container has items, find the closest item within it
          if (containerItems.length > 0) {
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id as string)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Handle case when draggable moves to new container and layout shifts
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // Return last match if no droppable matched
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, findContainer, items]
  );

  const activeTab = activeId ? tabs.find(t => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    const container = findContainer(event.active.id);
    setHoveredZone(container || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === 'favorites' || active.id === 'tabs') {
      return;
    }

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) {
      return;
    }

    // Update hoveredZone for ghost element
    setHoveredZone(overContainer);

    // If moving to different container, update immediately
    if (activeContainer !== overContainer) {
      const activeItems = items[activeContainer];
      const overItems = items[overContainer];
      const activeIndex = activeItems.indexOf(active.id as string);
      const overIndex = overItems.indexOf(overId as string);

      let newIndex: number;

      if (overId === overContainer) {
        // Dropping on empty container
        newIndex = overItems.length;
      } else {
        // Calculate position relative to item being hovered
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length;
      }

      recentlyMovedToNewContainer.current = true;

      // Update the tab's favorite status - work with the store directly, not the snapshot
      const tabIndex = workspaceStore.tabs.findIndex(t => t.id === active.id);
      if (tabIndex !== -1) {
        const tab = workspaceStore.tabs[tabIndex];
        tab.isFavorite = overContainer === 'favorites';

        // Reorder tabs array
        const allTabs = [...workspaceStore.tabs];
        const [movedTab] = allTabs.splice(tabIndex, 1);

        // Find insertion point
        const containerTabs = allTabs.filter(t =>
          overContainer === 'favorites' ? t.isFavorite : !t.isFavorite
        ).filter(t => t.spaceId === spaceId);

        const insertAtGlobalIndex = allTabs.indexOf(containerTabs[newIndex]) ?? allTabs.length;
        allTabs.splice(insertAtGlobalIndex, 0, movedTab);

        workspaceStore.tabs = allTabs;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setHoveredZone(null);
      return;
    }

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      setHoveredZone(null);
      return;
    }

    // If in same container, handle reordering
    if (activeContainer === overContainer && active.id !== over.id) {
      const containerTabs = workspaceStore.tabs
        .filter(t => t.spaceId === spaceId)
        .filter(t => (activeContainer === 'favorites' ? t.isFavorite : !t.isFavorite));

      const oldIndex = containerTabs.findIndex(t => t.id === active.id);
      const newIndex = containerTabs.findIndex(t => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const allTabs = [...workspaceStore.tabs];
        const activeTab = containerTabs[oldIndex];
        const overTab = containerTabs[newIndex];

        const activeGlobalIndex = allTabs.indexOf(activeTab);
        const overGlobalIndex = allTabs.indexOf(overTab);

        allTabs.splice(activeGlobalIndex, 1);
        const newGlobalIndex = allTabs.indexOf(overTab);
        allTabs.splice(newGlobalIndex + (oldIndex < newIndex ? 1 : 0), 0, activeTab);

        workspaceStore.tabs = allTabs;
      }
    }

    setActiveId(null);
    setHoveredZone(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setHoveredZone(null);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeTab ? (
          <TabDragGhost
            tab={activeTab}
            variant={hoveredZone === 'favorites' ? 'grid' : 'list'}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
