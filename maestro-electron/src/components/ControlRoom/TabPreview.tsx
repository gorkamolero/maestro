import { Terminal, Globe, FileText, AppWindow, Bot, Trash2, Settings, Save, CheckSquare, StickyNote } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { launchTab } from '@/hooks/useTabClick';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TerminalStatus } from './TerminalStatus';

interface TabPreviewProps {
  tab: Tab;
  onClick: () => void;
}

function TabTypeIcon({ type, className }: { type: Tab['type']; className?: string }) {
  const iconClass = cn('w-4 h-4', className);
  switch (type) {
    case 'terminal':
      return <Terminal className={iconClass} />;
    case 'browser':
      return <Globe className={iconClass} />;
    case 'app-launcher':
      return <AppWindow className={iconClass} />;
    case 'tasks':
      return <CheckSquare className={iconClass} />;
    case 'notes':
      return <StickyNote className={iconClass} />;
    case 'agent':
      return <Bot className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

const TAB_TYPE_LABELS: Record<Tab['type'], string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  'app-launcher': 'App',
  tasks: 'Tasks',
  notes: 'Notes',
  agent: 'Agent',
};

// Icon + label button view (for Control Room cards)
export function TabPreviewIcon({ tab, onClick }: TabPreviewProps) {
  // Use app icon for app-launcher tabs if available
  const appIcon = tab.type === 'app-launcher' && tab.appLauncherConfig?.icon;
  const label = tab.type === 'app-launcher'
    ? (tab.appLauncherConfig?.appName || tab.title).split(' ')[0] // First word only
    : TAB_TYPE_LABELS[tab.type];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For app-launcher tabs, launch the app directly
    if (tab.type === 'app-launcher') {
      launchTab(tab);
    } else {
      // For other tabs, use the provided onClick (maximize)
      onClick();
    }
  };

  const handleRemove = () => {
    workspaceActions.closeTab(tab.id);
  };

  const handleSaveContext = () => {
    // TODO: Implement save context functionality
    console.log('Save context for tab:', tab.id);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit tab:', tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            'flex flex-col items-center gap-1 p-1.5 rounded-lg min-w-[52px]',
            'bg-white/[0.04] hover:bg-white/[0.08] transition-colors',
            'text-muted-foreground hover:text-foreground',
            tab.disabled && 'opacity-40'
          )}
        >
          <div className="relative w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
            {appIcon ? (
              <img src={appIcon} alt={tab.title} className="w-5 h-5 rounded" />
            ) : (
              <TabTypeIcon type={tab.type} className="w-4 h-4" />
            )}
            {/* Status indicator for terminal/agent tabs */}
            {(tab.type === 'terminal' || tab.type === 'agent') && (
              <div className="absolute -top-0.5 -right-0.5">
                <TerminalStatus tabId={tab.id} />
              </div>
            )}
          </div>
          <span className="text-[10px] leading-tight truncate max-w-[48px]">
            {label}
          </span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent onClick={(e) => e.stopPropagation()}>
        <ContextMenuItem className="text-xs" disabled>
          {tab.title}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {tab.type === 'app-launcher' && (
          <ContextMenuItem onClick={handleSaveContext} className="gap-2">
            <Save className="w-3.5 h-3.5" />
            Save Context
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleEdit} className="gap-2">
          <Settings className="w-3.5 h-3.5" />
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Row view (for lists - kept for backwards compatibility)
export function TabPreview({ tab, onClick }: TabPreviewProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex items-center gap-2 w-full px-2 py-1.5 rounded text-left',
        'hover:bg-white/[0.06] transition-colors',
        'text-xs text-muted-foreground hover:text-foreground'
      )}
    >
      <TabTypeIcon type={tab.type} className="w-3 h-3" />
      <span className="flex-1 truncate">{tab.title}</span>
    </button>
  );
}

export { TabTypeIcon };
