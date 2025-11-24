import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import {
  LayoutGrid,
  LayoutList,
  Columns2,
  ChevronDown,
  Terminal,
  Globe,
  FileText,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResourcePanel } from '@/components/Monitor/ResourcePanel';

export function FloatingControls() {
  const { viewMode, activeSpaceId } = useWorkspaceStore();

  return (
    <div className="absolute top-4 right-4 z-[100] flex gap-2">
      {/* Resource Monitor */}
      <div className="bg-background/80 backdrop-blur-xl border border-border/50 rounded-lg px-3 shadow-lg flex items-center justify-center h-10">
        <ResourcePanel />
      </div>

      {/* Quick actions dock */}
      <TooltipProvider delayDuration={0}>
        <div className="flex gap-1 bg-background/80 backdrop-blur-xl border border-border/50 rounded-lg p-1 shadow-lg h-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (activeSpaceId) {
                    workspaceActions.openTab(activeSpaceId, 'terminal', 'New Terminal');
                  }
                }}
                disabled={!activeSpaceId}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Terminal</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (activeSpaceId) {
                    workspaceActions.openTab(activeSpaceId, 'browser', 'New Browser');
                  }
                }}
                disabled={!activeSpaceId}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Globe className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Browser</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  if (activeSpaceId) {
                    workspaceActions.openTab(activeSpaceId, 'note', 'New Note');
                  }
                }}
                disabled={!activeSpaceId}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New Note</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* View mode dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg hover:bg-background transition-colors">
                {viewMode === 'timeline' && <LayoutList className="w-4 h-4" />}
                {viewMode === 'split' && <Columns2 className="w-4 h-4" />}
                {viewMode === 'workspace' && <LayoutGrid className="w-4 h-4" />}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">View Mode</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => workspaceActions.setViewMode('timeline')}>
            <LayoutList className="w-4 h-4" />
            <span>Timeline Only</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => workspaceActions.setViewMode('split')}>
            <Columns2 className="w-4 h-4" />
            <span>Split View</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => workspaceActions.setViewMode('workspace')}>
            <LayoutGrid className="w-4 h-4" />
            <span>Workspace Only</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
