import type { Tab } from '@/stores/workspace.store';
import { BrowserPanel } from '@/components/Browser/BrowserPanel';
import { TerminalPanel } from '@/components/Terminal/TerminalPanel';
import { AgentPanel } from '@/components/Agent/AgentPanel';

interface WindowContentProps {
  tab: Tab;
  width: number;
  height: number;
}

/**
 * Renders the appropriate content for a tab inside a window.
 * Re-uses the same panel components used in the main view.
 */
export function WindowContent({ tab, width, height }: WindowContentProps) {
  // For browser tabs
  if (tab.type === 'browser') {
    return (
      <div className="flex flex-col" style={{ width, height }}>
        <BrowserPanel tab={tab} isActive={true} />
      </div>
    );
  }

  // For terminal tabs
  if (tab.type === 'terminal') {
    return (
      <div className="flex flex-col" style={{ width, height }}>
        <TerminalPanel segmentId={tab.id} />
      </div>
    );
  }

  // For agent tabs
  if (tab.type === 'agent') {
    return (
      <div className="flex flex-col" style={{ width, height }}>
        <AgentPanel tab={tab} />
      </div>
    );
  }

  // For tasks tabs - placeholder for now
  if (tab.type === 'tasks') {
    return (
      <div
        className="w-full h-full overflow-auto bg-card p-4"
        style={{ width, height }}
      >
        <div className="text-muted-foreground text-sm">
          Tasks view - coming soon
        </div>
      </div>
    );
  }

  // For notes tabs - placeholder for now
  if (tab.type === 'notes') {
    return (
      <div
        className="w-full h-full overflow-auto bg-card p-4"
        style={{ width, height }}
      >
        <div className="text-muted-foreground text-sm">
          Notes editor - coming soon
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div
      className="w-full h-full flex items-center justify-center bg-card"
      style={{ width, height }}
    >
      <div className="text-muted-foreground text-sm">
        Unknown tab type: {tab.type}
      </div>
    </div>
  );
}
