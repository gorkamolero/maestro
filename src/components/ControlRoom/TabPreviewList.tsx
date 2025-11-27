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
    <div className="flex flex-wrap gap-4">
      {visibleTabs.map((tab) => (
        <TabPreviewIcon
          key={tab.id}
          tab={tab}
          onClick={onTabClick ? () => onTabClick(tab.id) : undefined}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="flex items-center justify-center w-[52px] h-[52px] rounded-xl bg-white/[0.06] text-muted-foreground">
          <span className="text-xs font-medium">+{hiddenCount}</span>
        </div>
      )}

      {showAddButton && (
        <AddTabPopover spaceId={spaceId}>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-[52px] h-[52px] rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </AddTabPopover>
      )}

      {tabs.length === 0 && !showAddButton && (
        <p className="text-xs text-muted-foreground py-1 col-span-4">No tabs yet</p>
      )}
    </div>
  );
}
