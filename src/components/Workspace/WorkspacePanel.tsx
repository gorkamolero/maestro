import { useSnapshot } from 'valtio';
import { workspaceStore } from '@/stores/workspace.store';
import { Terminal, Globe, FileText, Bot } from 'lucide-react';

export function WorkspacePanel() {
  const { tabs, activeTabId } = useSnapshot(workspaceStore);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center space-y-3">
          <div className="text-4xl">👋</div>
          <p className="text-sm text-muted-foreground">
            Select a tab from the sidebar to get started
          </p>
          <p className="text-xs text-muted-foreground">
            Or create a new tab using the buttons above
          </p>
        </div>
      </div>
    );
  }

  // Render based on tab type
  switch (activeTab.type) {
    case 'note':
      return <NoteEditor tab={activeTab} />;

    case 'terminal':
      return <TerminalPlaceholder tab={activeTab} />;

    case 'browser':
      return <BrowserPlaceholder tab={activeTab} />;

    case 'agent':
      return <AgentPlaceholder tab={activeTab} />;

    default:
      return null;
  }
}

// Placeholder components for Phase 2
function TerminalPlaceholder({ tab }: { tab: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-black/90 text-green-400 font-mono p-8">
      <Terminal className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs opacity-50">Terminal integration coming in Phase 2</p>
      <div className="mt-4 p-3 bg-black/50 rounded border border-green-500/20">
        <div className="text-xs">$ Ready for XTerm.js integration</div>
        <div className="text-xs opacity-50 mt-1">...</div>
      </div>
    </div>
  );
}

function BrowserPlaceholder({ tab }: { tab: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
      <Globe className="w-12 h-12 mb-4 text-muted-foreground" />
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs text-muted-foreground mb-4">
        Browser integration coming in Phase 2
      </p>
      <div className="w-full max-w-md p-4 border rounded-lg">
        <input
          type="text"
          placeholder="https://..."
          className="w-full p-2 bg-background border rounded text-sm"
          disabled
        />
        <div className="mt-4 h-48 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          Webview preview
        </div>
      </div>
    </div>
  );
}

function AgentPlaceholder({ tab }: { tab: any }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
      <Bot className="w-12 h-12 mb-4 text-primary" />
      <p className="text-sm mb-2">{tab.title}</p>
      <p className="text-xs text-muted-foreground mb-4">
        Agent integration coming in Phase 2
      </p>
      <div className="w-full max-w-md space-y-3">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1 p-3 bg-muted rounded-lg">
            <p className="text-xs">AI agent conversations will appear here</p>
          </div>
        </div>
      </div>
    </div>
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
