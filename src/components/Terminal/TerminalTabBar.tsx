import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TerminalTabData } from './hooks/useTerminalTabs';

interface TerminalTabBarProps {
  tabs: TerminalTabData[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export function TerminalTabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
}: TerminalTabBarProps) {
  return (
    <div
      className="terminal-tabs flex items-center gap-1 px-2 py-1 border-b overflow-x-auto"
      style={{
        background: 'rgba(10, 10, 10, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`
            flex items-center gap-2 px-3 py-1 rounded-t text-xs cursor-pointer
            transition-all duration-200
            ${
              tab.id === activeTabId
                ? 'bg-background/60 text-foreground border-t border-x border-primary/30'
                : 'bg-transparent text-muted-foreground hover:bg-background/30'
            }
          `}
          onClick={() => onTabSelect(tab.id)}
        >
          <span className="select-none">{tab.title}</span>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 ml-1"
        onClick={onNewTab}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}
