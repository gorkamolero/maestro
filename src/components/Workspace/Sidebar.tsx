import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { Terminal, Globe, FileText } from 'lucide-react';
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
import { TabDragPreview } from './TabDragPreview';
import { useTabDragMonitor } from '@/hooks/useTabDragMonitor';
import { useTabDropHandler } from '@/hooks/useTabDropHandler';

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  note: 'Notes',
  agent: 'Agent',
};

export function Sidebar() {
  const { tabs, activeSpaceId } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);
  const [api, setApi] = useState<CarouselApi>();

  // Drag and drop hooks
  const dragState = useTabDragMonitor();
  useTabDropHandler();

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
        </TooltipProvider>
      </div>

      <Separator />

      {/* Entire content area is swipeable */}
      <Carousel setApi={setApi} className="flex-1" opts={{ watchDrag: true }}>
        <CarouselContent className="h-full ml-0">
          {spaces.map((space) => {
            const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
            const favoriteTabs = spaceTabs.filter((t) => t.isFavorite);
            const regularTabs = spaceTabs.filter((t) => !t.isFavorite);

            return (
              <CarouselItem key={space.id} className="pl-0 h-full">
                <div className="h-full flex flex-col">
                  {/* Favorites Section */}
                  <div className="p-3">
                    <TabDropZone
                      zone="favorites"
                      tabs={favoriteTabs}
                      spaceId={space.id}
                      title="Favorites"
                      emptyMessage="No favorites yet"
                    />
                  </div>

                  <Separator />

                  {/* Tabs Section */}
                  <div className="flex-1 px-3 py-2 overflow-y-auto">
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

      {/* Drag Preview Overlay */}
      <TabDragPreview
        tab={dragState.draggedTab}
        zone={dragState.currentZone}
        position={dragState.cursorPosition}
      />
    </div>
  );
}
