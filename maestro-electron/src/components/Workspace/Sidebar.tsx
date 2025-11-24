import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { launcherStore } from '@/stores/launcher.store';
import { FileText, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TabsSidebar } from './TabsSidebar';
import { NotesSidebar } from '@/components/Notes/NotesSidebar';
import { DraggableWorkspace } from './DraggableWorkspace';

interface SidebarProps {
  onCommandPalette?: () => void;
}

export function Sidebar({ onCommandPalette }: SidebarProps) {
  const { activeSpaceId, workspaceViewMode } = useSnapshot(workspaceStore);

  const handleViewModeSwitch = (mode: 'notes' | 'tabs') => {
    workspaceActions.setWorkspaceViewMode(mode);
  };

  const handleNewTab = (type: TabType) => {
    if (!activeSpaceId) return;
    // First switch to tabs view, then open the tab
    workspaceActions.setWorkspaceViewMode('tabs');
    const title = type === 'terminal' ? 'New Terminal'
      : type === 'browser' ? 'New Browser'
      : type === 'tasks' ? 'New Tasks Board'
      : type === 'agent' ? 'New Agent'
      : 'New App';
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
      {/* View Mode Switcher */}
      <div className="h-14 p-3 flex items-center justify-start gap-2 border-b border-border/50">
        <TooltipProvider delayDuration={0}>
          {/* Tabs View Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleViewModeSwitch('tabs')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
                  workspaceViewMode === 'tabs'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/50 hover:bg-background'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Tabs View</p>
            </TooltipContent>
          </Tooltip>

          {/* Notes View Mode */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleViewModeSwitch('notes')}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
                  workspaceViewMode === 'notes'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/50 hover:bg-background'
                }`}
              >
                <FileText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Notes View</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Conditional Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {workspaceViewMode === 'tabs' ? (
          <DraggableWorkspace spaceId={activeSpaceId}>
            <TabsSidebar onCommandPalette={onCommandPalette} />
          </DraggableWorkspace>
        ) : (
          <NotesSidebar spaceId={activeSpaceId} />
        )}
      </div>
    </div>
  );
}
