import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { FileText, LayoutGrid, Home } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TabsSidebar } from './TabsSidebar';
import { NotesSidebar } from '@/components/Notes/NotesSidebar';
import { TabsViewModeSelector } from './TabsViewModeSelector';

interface SidebarProps {
  onCommandPalette?: () => void;
}

export function Sidebar({ onCommandPalette }: SidebarProps) {
  const { activeSpaceId, workspaceViewMode } = useWorkspaceStore();

  const handleViewModeSwitch = (mode: 'notes' | 'tabs') => {
    workspaceActions.setWorkspaceViewMode(mode);
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
          {/* Control Room Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => workspaceActions.returnToControlRoom()}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm bg-background/50 hover:bg-background"
              >
                <Home className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Control Room (Esc)</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border/50" />

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

          {/* Tabs View Mode Selector - Only show when in tabs view */}
          {workspaceViewMode === 'tabs' && (
            <div className="ml-auto">
              <TabsViewModeSelector />
            </div>
          )}
        </TooltipProvider>
      </div>

      {/* Conditional Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {workspaceViewMode === 'tabs' ? (
          <TabsSidebar onCommandPalette={onCommandPalette} />
        ) : (
          <NotesSidebar spaceId={activeSpaceId} />
        )}
      </div>
    </div>
  );
}
