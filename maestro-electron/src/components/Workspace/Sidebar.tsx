import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { FileText, LayoutGrid } from 'lucide-react';
import { TabsSidebar } from './TabsSidebar';
import { NotesSidebar } from '@/components/Notes/NotesSidebar';
import { TabsViewModeSelector } from './TabsViewModeSelector';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { activeSpaceId, workspaceViewMode } = useWorkspaceStore();

  const handleViewModeSwitch = (mode: 'notes' | 'tabs') => {
    workspaceActions.setWorkspaceViewMode(mode);
  };

  if (!activeSpaceId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          No active space
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-muted/30">
      {/* View Mode Switcher - Zed style minimal header */}
      <div className="h-10 px-2 flex items-center gap-1 border-b border-white/[0.04]">
        {/* Tabs View Mode */}
        <button
          onClick={() => handleViewModeSwitch('tabs')}
          className={cn(
            'h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
            workspaceViewMode === 'tabs'
              ? 'bg-white/[0.08] text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Tabs</span>
        </button>

        {/* Notes View Mode */}
        <button
          onClick={() => handleViewModeSwitch('notes')}
          className={cn(
            'h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
            workspaceViewMode === 'notes'
              ? 'bg-white/[0.08] text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>

        {/* Tabs View Mode Selector - Only show when in tabs view */}
        {workspaceViewMode === 'tabs' && (
          <div className="ml-auto">
            <TabsViewModeSelector />
          </div>
        )}
      </div>

      {/* Conditional Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {workspaceViewMode === 'tabs' ? (
          <TabsSidebar />
        ) : (
          <NotesSidebar spaceId={activeSpaceId} />
        )}
      </div>
    </div>
  );
}
