import { X } from 'lucide-react';
import { Tab, workspaceActions, useWorkspaceStore } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';
import { getTabIcon } from '@/lib/tab-utils';
import { useTabClick } from '@/hooks/useTabClick';

interface ListTabProps {
  tab: Tab;
}

export function ListTab({ tab }: ListTabProps) {
  const { activeTabId } = useWorkspaceStore();
  const handleTabClick = useTabClick(tab);
  const isActive = activeTabId === tab.id;

  return (
    <div
      data-draggable="true"
      onClick={handleTabClick}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md',
        'cursor-pointer transition-colors',
        isActive
          ? 'bg-white/[0.08] text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]',
        tab.disabled && 'opacity-40'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-4 h-4">
        {getTabIcon(tab, 'sm')}
      </div>

      {/* Status Indicator */}
      {tab.status === 'running' && (
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}

      {/* Title */}
      <span className="text-xs truncate flex-1">{tab.title}</span>

      {/* Close Button - only show on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          workspaceActions.closeTab(tab.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] transition-all"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
