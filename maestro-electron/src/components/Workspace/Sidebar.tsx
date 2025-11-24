import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { launcherStore } from '@/stores/launcher.store';
import { notesActions } from '@/stores/notes.store';
import { Terminal, Globe, FileText, Plus, Command, ListTodo } from 'lucide-react';
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
import { DraggableWorkspace } from './DraggableWorkspace';

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  note: 'Notes',
  agent: 'Agent',
  'app-launcher': 'App',
  tasks: 'Tasks',
};

interface SidebarContentProps {
  onCommandPalette?: () => void;
}

function SidebarContent({ onCommandPalette }: SidebarContentProps) {
  const { tabs, activeSpaceId } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);
  const [api, setApi] = useState<CarouselApi>();

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

    // Special handling for notes: create note in store and link to tab
    if (type === 'note') {
      const note = notesActions.createNote(activeSpaceId, 'untitled.md');
      workspaceActions.openTab(activeSpaceId, type, note.name, {
        noteState: {
          noteId: note.id,
          viewMode: 'panel',
        },
      });
    } else {
      workspaceActions.openTab(activeSpaceId, type, title);
    }
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
    <div className="w-full h-full flex flex-col">
        {/* Quick actions dock - Arc style */}
        <div className="h-14 p-3 flex items-center justify-center gap-2 border-b border-border/50">
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
                onClick={() => handleNewTab('tasks')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <ListTodo className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Tasks Board</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCommandPalette}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Command className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">Command Palette (⌘K)</p>
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
  );
}

interface SidebarProps {
  onCommandPalette?: () => void;
}

export function Sidebar({ onCommandPalette }: SidebarProps) {
  const { activeSpaceId } = useSnapshot(workspaceStore);

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
    <DraggableWorkspace spaceId={activeSpaceId}>
      <SidebarContent onCommandPalette={onCommandPalette} />
    </DraggableWorkspace>
  );
}
