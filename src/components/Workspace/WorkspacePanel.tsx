import { useSnapshot } from 'valtio';
import { workspaceStore } from '@/stores/workspace.store';
import { Terminal, Globe, FileText, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Render based on tab type with animations
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="flex-1"
      >
        {activeTab.type === 'note' && <NoteEditor tab={activeTab} />}
        {activeTab.type === 'terminal' && <TerminalPlaceholder tab={activeTab} />}
        {activeTab.type === 'browser' && <BrowserPlaceholder tab={activeTab} />}
        {activeTab.type === 'agent' && <AgentPlaceholder tab={activeTab} />}
      </motion.div>
    </AnimatePresence>
  );
}

// Placeholder components for Phase 2
function TerminalPlaceholder({ tab }: { tab: any }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center bg-black/90 text-green-400 font-mono p-8"
    >
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Terminal className="w-12 h-12 mb-4 opacity-50" />
      </motion.div>
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs opacity-50">Terminal integration coming in Phase 2</p>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-4 p-3 bg-black/50 rounded border border-green-500/20"
      >
        <div className="text-xs">$ Ready for XTerm.js integration</div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs mt-1"
        >
          ...
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function BrowserPlaceholder({ tab }: { tab: any }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center bg-background p-8"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <Globe className="w-12 h-12 mb-4 text-muted-foreground" />
      </motion.div>
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs text-muted-foreground mb-4">
        Browser integration coming in Phase 2
      </p>
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
    </motion.div>
  );
}

function AgentPlaceholder({ tab }: { tab: any }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center bg-background p-8"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Bot className="w-12 h-12 mb-4 text-primary" />
      </motion.div>
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs text-muted-foreground mb-4">
        Agent integration coming in Phase 2
      </p>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md space-y-3"
      >
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1 p-3 bg-muted rounded-lg">
            <p className="text-xs">AI agent conversations will appear here</p>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Simple note editor (already works!)
function NoteEditor({ tab }: { tab: any }) {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-medium">{tab.title}</h2>
      </div>
      <div className="flex-1 p-4">
        <textarea
          className="w-full h-full resize-none bg-transparent border-none focus:outline-none focus:ring-0 font-mono text-sm"
          placeholder="Start writing..."
          defaultValue={tab.content || ''}
        />
      </div>
    </div>
  );
}
