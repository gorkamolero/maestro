import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { Terminal, Globe, FileText, Bot, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="w-full h-full bg-muted/30 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select a track from the dock below
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-muted/30 flex flex-col">
      {/* Quick actions */}
      <TooltipProvider delayDuration={0}>
        <div className="p-3 flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => handleNewTab('terminal')}
                className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Terminal className="w-4 h-4 mx-auto" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">New Terminal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => handleNewTab('browser')}
                className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="w-4 h-4 mx-auto" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">New Browser</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => handleNewTab('note')}
                className="flex-1 p-2 rounded-md bg-background/50 hover:bg-background border border-border/50 hover:border-border transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileText className="w-4 h-4 mx-auto" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">New Note</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <Separator />

      {/* Tab groups */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTabs).map(([type, typeTabs]) => {
          if (typeTabs.length === 0) return null;

          const Icon = TAB_ICONS[type as TabType];
          const label = TAB_LABELS[type as TabType];

          return (
            <div key={type} className="p-2">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                {label}
              </motion.div>
              <div className="space-y-1 mt-1">
                <AnimatePresence mode="popLayout">
                  {typeTabs.map((tab) => {
                    const isActive = tab.id === activeTabId;

                    return (
                      <motion.div
                        key={tab.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'group relative px-2 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-colors',
                          'hover:bg-background/80',
                          isActive && 'bg-background border border-border'
                        )}
                        onClick={() => workspaceActions.setActiveTab(tab.id)}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-primary/10 rounded-md border border-primary/50"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <Icon className="w-3.5 h-3.5 flex-shrink-0 relative z-10" />
                        <span className="flex-1 text-xs truncate relative z-10">{tab.title}</span>
                        {tab.status === 'running' && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 relative z-10"
                          />
                        )}
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            workspaceActions.closeTab(tab.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/20 rounded relative z-10"
                        >
                          <X className="w-3 h-3" />
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
