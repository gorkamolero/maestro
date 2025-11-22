import React from 'react';
import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Terminal, Globe, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { Activity } from 'react';
import { SegmentMetrics } from '@/components/Monitor/SegmentMetrics';
import { segmentsStore } from '@/stores/segments.store';
import { TerminalPanel } from '@/components/Terminal/TerminalPanel';
import type { TerminalState } from '@/components/Terminal/terminal.utils';

export function WorkspacePanel() {
  const { tabs, activeTabId } = useSnapshot(workspaceStore);

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

  // Render active tab normally, previously active tabs use Activity to stay alive
  const [mountedTabs, setMountedTabs] = React.useState(new Set<string>());

  // Track which tabs have been mounted
  React.useEffect(() => {
    if (activeTabId) {
      setMountedTabs((prev) => new Set(prev).add(activeTabId));
    }
  }, [activeTabId]);

  return (
    <div className="flex-1 relative">
      {tabs.map((tab) => {
        // Only render if this tab is currently active OR has been mounted before
        if (!mountedTabs.has(tab.id)) return null;

        return (
          <Activity key={tab.id} mode={tab.id === activeTabId ? 'visible' : 'hidden'}>
            <div className="absolute inset-0">
              {tab.type === 'note' && <NoteEditor tab={tab} />}
              {tab.type === 'terminal' && <TerminalView tab={tab} />}
              {tab.type === 'browser' && <BrowserPlaceholder tab={tab} />}
              {tab.type === 'agent' && <AgentPlaceholder tab={tab} />}
            </div>
          </Activity>
        );
      })}
    </div>
  );
}

// Terminal component - now fully functional!
function TerminalView({ tab }: { tab: any }) {
  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col"
    >
      {/* Terminal header with metrics */}
      {segment && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span className="text-sm">{tab.title}</span>
          </div>
          <SegmentMetrics segmentId={segment.id} compact />
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

function BrowserPlaceholder({ tab }: { tab: any }) {
  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Browser header with metrics */}
      {segment && (
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{tab.title}</span>
          </div>
          <SegmentMetrics segmentId={segment.id} compact />
        </div>
      )}

      {/* Browser content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <Globe className="w-12 h-12 mb-4 text-muted-foreground" />
        </motion.div>
        <p className="text-sm mb-2">{!segment && tab.title}</p>
        <p className="text-xs text-muted-foreground mb-4">Browser integration coming in Phase 2</p>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md p-4 border rounded-lg"
        >
          <input
            type="text"
            placeholder="https://..."
            className="w-full p-2 bg-background border rounded text-sm"
            disabled
          />
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 192 }}
            transition={{ delay: 0.4 }}
            className="mt-4 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground overflow-hidden"
          >
            Webview preview
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function AgentPlaceholder({ tab }: { tab: any }) {
  const { activeSegments } = useSnapshot(segmentsStore);
  const segment = activeSegments.find((s) => s.id === tab.segmentId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Agent header with metrics */}
      {segment && (
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{tab.title}</span>
          </div>
          <SegmentMetrics segmentId={segment.id} compact />
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

function NoteEditor({ tab }: { tab: any }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 p-6"
    >
      <p className="text-sm text-muted-foreground">Note editor for {tab.title}</p>
    </motion.div>
  );
}
