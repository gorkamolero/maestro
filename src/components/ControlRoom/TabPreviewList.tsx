import { Plus } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { TabPreviewIcon } from './TabPreview';
import { AddTabPopover } from './AddTabPopover';

interface TabPreviewListProps {
  tabs: Tab[];
  spaceId: string;
  onTabClick?: (tabId: string) => void;
  showAddButton?: boolean;
  maxVisible?: number;
}

export function TabPreviewList({
  tabs,
  spaceId,
  onTabClick,
  showAddButton = true,
  maxVisible = 12,
}: TabPreviewListProps) {
  const visibleTabs = tabs.slice(0, maxVisible);
  const hiddenCount = tabs.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-2 content-start">
      {visibleTabs.map((tab) => (
        <TabPreviewIcon
          key={tab.id}
          tab={tab}
          onClick={onTabClick ? () => onTabClick(tab.id) : undefined}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg w-[52px] h-[52px] bg-white/[0.04] text-muted-foreground">
          <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center text-xs font-medium">
            +{hiddenCount}
          </div>
          <span className="text-[10px] leading-tight">more</span>
        </div>
      )}

      {showAddButton && (
        <AddTabPopover spaceId={spaceId}>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-1 p-1.5 rounded-lg w-[52px] h-[52px] bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[10px] leading-tight">Add</span>
          </button>
        </AddTabPopover>
      )}

      {tabs.length === 0 && !showAddButton && (
        <p className="text-xs text-muted-foreground py-1">No tabs yet</p>
      )}
    </div>
  );
}
