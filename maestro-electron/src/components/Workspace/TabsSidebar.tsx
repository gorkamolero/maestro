import { useWorkspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { launcherStore } from '@/stores/launcher.store';
import { Terminal, Globe, ListTodo, Plus } from 'lucide-react';
import { TabDropZone } from './TabDropZone';
import { cn } from '@/lib/utils';

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  agent: 'Agent',
  'app-launcher': 'App',
  tasks: 'Tasks',
  notes: 'Notes',
};

function ActionButton({
  onClick,
  icon: Icon,
  label
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-7 px-2 rounded-md text-[11px] font-medium',
        'flex items-center gap-1.5 transition-colors',
        'text-muted-foreground hover:text-foreground hover:bg-white/[0.06]'
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function TabsSidebar() {
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
      {/* Quick actions - Zed style inline buttons */}
      <div className="px-2 py-2 flex flex-wrap gap-1 border-b border-white/[0.04]">
        <ActionButton onClick={() => handleNewTab('terminal')} icon={Terminal} label="Terminal" />
        <ActionButton onClick={() => handleNewTab('browser')} icon={Globe} label="Browser" />
        <ActionButton onClick={() => handleNewTab('tasks')} icon={ListTodo} label="Tasks" />
        <ActionButton onClick={handleAddApp} icon={Plus} label="App" />
      </div>

      {/* Tabs list */}
      <div className="flex-1 px-2 py-2 overflow-y-auto min-h-0">
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
