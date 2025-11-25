import { Terminal, Globe, FileText, AppWindow, Bot } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

interface TabPreviewProps {
  tab: Tab;
  onClick: () => void;
}

function TabTypeIcon({ type }: { type: Tab['type'] }) {
  switch (type) {
    case 'terminal':
      return <Terminal className="w-3 h-3" />;
    case 'browser':
      return <Globe className="w-3 h-3" />;
    case 'app-launcher':
      return <AppWindow className="w-3 h-3" />;
    case 'tasks':
      return <FileText className="w-3 h-3" />;
    case 'agent':
      return <Bot className="w-3 h-3" />;
    default:
      return <FileText className="w-3 h-3" />;
  }
}

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
      <TabTypeIcon type={tab.type} />
      <span className="flex-1 truncate">{tab.title}</span>
    </button>
  );
}

export { TabTypeIcon };
