import { useWorkspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { launcherStore } from '@/stores/launcher.store';
import { Terminal, Globe, ListTodo, Plus, Command } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TabDropZone } from './TabDropZone';

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  agent: 'Agent',
  'app-launcher': 'App',
  tasks: 'Tasks',
};

interface TabsSidebarProps {
  onCommandPalette?: () => void;
}

export function TabsSidebar({ onCommandPalette }: TabsSidebarProps) {
  const { tabs, activeSpaceId, tabsViewMode } = useWorkspaceStore();

  // Filter tabs for the active space
  const spaceTabs = tabs.filter((t) => t.spaceId === activeSpaceId);

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

      {/* Tabs list */}
      <div className="flex-1 px-3 py-2 overflow-y-auto min-h-0">
        <TabDropZone
          tabs={spaceTabs}
          spaceId={activeSpaceId}
          viewMode={tabsViewMode}
          emptyMessage="No tabs yet"
        />
      </div>
    </div>
  );
}
