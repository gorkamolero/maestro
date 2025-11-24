import React, { Activity } from 'react';
import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type Tab } from '@/stores/workspace.store';
import { Terminal, Globe, Bot, ListTodo } from 'lucide-react';
import { motion } from 'motion/react';
import { segmentsStore } from '@/stores/segments.store';
import { TerminalPanel } from '@/components/Terminal/TerminalPanel';
import { BrowserPanel } from '@/components/Browser/BrowserPanel';
import { TasksView } from '@/components/Tasks/TasksView';
import type { TerminalState } from '@/components/Terminal/terminal.utils';

export function WorkspacePanel() {
  const { tabs, activeTabId } = useSnapshot(workspaceStore);

  // Log activeTabId changes
  React.useEffect(() => {
  }, [activeTabId]);

  // Hooks must be called before any early returns
  const [mountedTabs, setMountedTabs] = React.useState(new Set<string>());

  // Track which tabs have been mounted
  React.useEffect(() => {
    if (activeTabId) {
      setMountedTabs((prev) => new Set(prev).add(activeTabId));
    }
  }, [activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center bg-background/50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-3"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-4xl"
          >
            👋
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Select a tab from the sidebar to get started
          </p>
          <p className="text-xs text-muted-foreground">
            Or create a new tab using the buttons above
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      {tabs.map((tab) => {
        // Only render if this tab is currently active OR has been mounted before
        if (!mountedTabs.has(tab.id)) return null;

        return (
          <Activity key={tab.id} mode={tab.id === activeTabId ? 'visible' : 'hidden'}>
            <div className="absolute inset-0">
              {tab.type === 'terminal' && <TerminalView tab={tab} />}
              {tab.type === 'browser' && (() => {
                const isActiveComputed = tab.id === activeTabId;
                return <BrowserView tab={tab} isActive={isActiveComputed} />;
              })()}
              {tab.type === 'agent' && <AgentPlaceholder tab={tab} />}
              {tab.type === 'tasks' && <TasksTabView tab={tab} />}
            </div>
          </Activity>
        );
      })}
    </div>
  );
}

// Terminal component - now fully functional!
function TerminalView({ tab }: { tab: Tab }) {
  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col"
    >
      {/* Terminal header */}
      {segment && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="text-sm">{tab.title}</span>
          </div>
        </div>
      )}

      {/* Terminal panel */}
      <div className="flex-1">
        <TerminalPanel
          segmentId={tab.id}
          initialState={
            tab.terminalState
              ? {
                  buffer: tab.terminalState.buffer || '',
                  workingDir: tab.terminalState.workingDir || null,
                  scrollPosition: tab.terminalState.scrollPosition || 0,
                  theme: tab.terminalState.theme || 'termius-dark',
                }
              : undefined
          }
          onStateChange={(state: TerminalState) => {
            // Save terminal state to tab
            workspaceActions.updateTabTerminalState(tab.id, state);
          }}
        />
      </div>
    </motion.div>
  );
}

// Browser component - now with BrowserPanel!
function BrowserView({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  React.useEffect(() => {
  }, [isActive, tab.id]);

  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col"
    >
      {/* Browser header */}
      {segment && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{tab.title}</span>
          </div>
        </div>
      )}

      {/* Browser panel */}
      <div className="flex-1 flex flex-col">
        <BrowserPanel tab={tab} isActive={isActive} />
      </div>
    </motion.div>
  );
}

function AgentPlaceholder({ tab }: { tab: Tab }) {
  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Agent header */}
      {segment && (
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{tab.title}</span>
          </div>
        </div>
      )}

      {/* Agent content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bot className="w-12 h-12 mb-4 text-muted-foreground" />
        </motion.div>
        <p className="text-sm mb-2">{!segment && tab.title}</p>
        <p className="text-xs text-muted-foreground">AI Agent integration coming in Phase 2</p>
      </div>
    </motion.div>
  );
}

function TasksTabView({ tab }: { tab: Tab }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col"
    >
      <TasksView boardTabId={tab.id} />
    </motion.div>
  );
}
