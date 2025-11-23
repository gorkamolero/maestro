import { useSnapshot } from 'valtio';
import { DragDropContext, DropResult, type DragUpdate } from '@hello-pangea/dnd';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { Terminal, Globe, FileText, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useEffect, useState } from 'react';
import { TabDropZone } from './TabDropZone';
import { DragProvider, useDragContext } from './DragContext';
import { launcherStore, launcherActions } from '@/stores/launcher.store';

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  note: 'Notes',
  agent: 'Agent',
};

function SidebarContent() {
  const { tabs, activeSpaceId } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);
  const launcherSnap = useSnapshot(launcherStore);
  const [api, setApi] = useState<CarouselApi>();
  const { setTargetZone } = useDragContext();

  const handleDragUpdate = (result: DragUpdate) => {
    if (result.destination) {
      const targetZone = result.destination.droppableId.split('-')[0] as 'favorites' | 'tabs';
      setTargetZone(targetZone);
    } else {
      setTargetZone(null);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    setTargetZone(null);
    const { source, destination, draggableId } = result;

    // Dropped outside of any droppable
    if (!destination) return;

    // Parse the zone and tabId from the draggableId (format: "zone-tabId")
    const tabId = draggableId.split('-').slice(1).join('-');

    // Parse source and destination zones from droppableId (format: "zone-spaceId")
    const sourceZone = source.droppableId.split('-')[0] as 'favorites' | 'tabs';
    const targetZone = destination.droppableId.split('-')[0] as 'favorites' | 'tabs';

    if (sourceZone === targetZone && source.index === destination.index) {
      // No change
      return;
    }

    if (sourceZone === targetZone) {
      // Reordering within the same zone
      workspaceActions.reorderTabInZone(tabId, targetZone, destination.index);
    } else {
      // Moving between zones
      workspaceActions.moveTabToZone(tabId, targetZone, destination.index);
    }
  };

  const currentSpaceIndex = spaces.findIndex((s) => s.id === activeSpaceId);

  useEffect(() => {
    if (!api || currentSpaceIndex === -1) return;
    api.scrollTo(currentSpaceIndex, false);
  }, [api, currentSpaceIndex]);

  useEffect(() => {
    if (!api) return;
    api.on('select', () => {
      const index = api.selectedScrollSnap();
      if (spaces[index] && spaces[index].id !== activeSpaceId) {
        workspaceActions.switchSpace(spaces[index].id);
      }
    });
  }, [api, spaces, activeSpaceId]);

  const handleNewTab = (type: TabType) => {
    if (!activeSpaceId) return;
    const title = `New ${TAB_LABELS[type]}`;
    workspaceActions.openTab(activeSpaceId, type, title);
  };

  const handleAddApp = () => {
    launcherStore.isAddModalOpen = true;
  };

  if (!activeSpaceId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select a space below to get started
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragUpdate={handleDragUpdate} onDragEnd={handleDragEnd}>
      <div className="w-full h-full flex flex-col">
        {/* Quick actions dock - Arc style */}
        <div className="p-3 flex items-center justify-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('terminal')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Terminal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('browser')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Globe className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Browser</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('note')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Note</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleAddApp}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">Add App</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Entire content area is swipeable */}
      <Carousel
        setApi={setApi}
        className="flex-1"
        opts={{
          watchDrag: (_, event) => {
            const target = event.target as HTMLElement;
            // Disable carousel drag if interacting with draggable tabs
            if (target.closest('[data-draggable="true"]')) {
              return false;
            }
            return true;
          }
        }}
      >
        <CarouselContent className="h-full ml-0">
          {spaces.map((space) => {
            const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
            const favoriteTabs = spaceTabs.filter((t) => t.isFavorite);
            const regularTabs = spaceTabs.filter((t) => !t.isFavorite);
            const appFavorites = launcherSnap.favoritesByWorkspace[space.id] || [];

            return (
              <CarouselItem key={space.id} className="pl-0 h-full">
                <div className="h-full flex flex-col">
                  {/* Favorites Section */}
                  <div className="p-3 flex-shrink-0">
                    <TabDropZone
                      zone="favorites"
                      tabs={favoriteTabs}
                      spaceId={space.id}
                      title="Favorites"
                      emptyMessage="No favorites yet"
                      appFavorites={appFavorites}
                      getConnectedApp={launcherActions.getConnectedApp}
                    />
                  </div>

                  <Separator />

                  {/* Tabs Section */}
                  <div className="flex-1 px-3 py-2 overflow-y-auto min-h-0">
                    <TabDropZone
                      zone="tabs"
                      tabs={regularTabs}
                      spaceId={space.id}
                      title="Tabs"
                      emptyMessage="No tabs yet"
                    />
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
      </div>
    </DragDropContext>
  );
}

export function Sidebar() {
  return (
    <DragProvider>
      <SidebarContent />
    </DragProvider>
  );
}
