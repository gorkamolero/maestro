import { Terminal, Globe, Bot, FileText, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tabsActions, type Tab as TabType } from '@/stores/tabs.store';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { SegmentType } from '@/types';

const TAB_ICONS: Record<SegmentType, any> = {
  terminal: Terminal,
  browser: Globe,
  agent: Bot,
  note: FileText,
  external: ExternalLink,
  planted: FileText,
};

interface TabProps {
  tab: TabType;
}

export function Tab({ tab }: TabProps) {
  const Icon = TAB_ICONS[tab.type];

  const handleClick = () => {
    tabsActions.setActiveTab(tab.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    tabsActions.closeTab(tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={handleClick}
          className={cn(
            'h-full px-3 flex items-center gap-2 border-r border-border cursor-pointer transition-colors group',
            'hover:bg-accent',
            tab.isActive && 'bg-background'
          )}
        >
          <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate max-w-[150px]">{tab.title}</span>
          <button
            onClick={handleClose}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:bg-muted rounded-sm p-0.5"
            aria-label="Close tab"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => tabsActions.closeTab(tab.id)}>
          Close
        </ContextMenuItem>
        <ContextMenuItem onClick={() => tabsActions.closeOtherTabs(tab.id)}>
          Close Others
        </ContextMenuItem>
        <ContextMenuItem onClick={() => tabsActions.closeAllTabs()}>
          Close All
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
