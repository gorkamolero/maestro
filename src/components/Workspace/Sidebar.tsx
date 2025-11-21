import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { Terminal, Globe, FileText, Bot, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const TAB_ICONS: Record<TabType, any> = {
  terminal: Terminal,
  browser: Globe,
  note: FileText,
  agent: Bot,
};

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  note: 'Notes',
  agent: 'Agent',
};

export function Sidebar() {
  const { tabs, activeTabId, activeTrackId } = useSnapshot(workspaceStore);

  // Group tabs by type for current track
  const trackTabs = tabs.filter((t) => t.trackId === activeTrackId);
  const groupedTabs = {
    terminal: trackTabs.filter((t) => t.type === 'terminal'),
    browser: trackTabs.filter((t) => t.type === 'browser'),
    note: trackTabs.filter((t) => t.type === 'note'),
    agent: trackTabs.filter((t) => t.type === 'agent'),
  };

  const handleNewTab = (type: TabType) => {
    if (!activeTrackId) return;
    const title = `New ${TAB_LABELS[type]}`;
    workspaceActions.openTab(activeTrackId, type, title);
  };

  if (!activeTrackId) {
    return (
      <div className="w-[200px] bg-muted/30 border-r border-border flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select a track from the dock below
        </p>
      </div>
    );
  }

  return (
    <div className="w-[200px] bg-muted/30 border-r border-border flex flex-col">
      {/* Quick actions */}
      <div className="p-3 flex gap-2">
        <button
          onClick={() => handleNewTab('terminal')}
          className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
          title="New Terminal"
        >
          <Terminal className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={() => handleNewTab('browser')}
          className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
          title="New Browser"
        >
          <Globe className="w-4 h-4 mx-auto" />
        </button>
        <button
          onClick={() => handleNewTab('note')}
          className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
          title="New Note"
        >
          <FileText className="w-4 h-4 mx-auto" />
        </button>
      </div>

      <Separator />

      {/* Tab groups */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTabs).map(([type, typeTabs]) => {
          if (typeTabs.length === 0) return null;

          const Icon = TAB_ICONS[type as TabType];
          const label = TAB_LABELS[type as TabType];

          return (
            <div key={type} className="p-2">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </div>
              <div className="space-y-1 mt-1">
                {typeTabs.map((tab) => {
                  const isActive = tab.id === activeTabId;

                  return (
                    <div
                      key={tab.id}
                      className={cn(
                        'group relative px-2 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-colors',
                        'hover:bg-background/80',
                        isActive && 'bg-background border border-border'
                      )}
                      onClick={() => workspaceActions.setActiveTab(tab.id)}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1 text-xs truncate">{tab.title}</span>
                      {tab.status === 'running' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          workspaceActions.closeTab(tab.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
