import { Plus } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { TabPreviewIcon } from './TabPreview';
import { AddTabPopover } from './AddTabPopover';

interface TabPreviewListProps {
  tabs: Tab[];
  spaceId: string;
  onTabClick: (tabId: string) => void;
  showAddButton?: boolean;
  maxVisible?: number;
}

export function TabPreviewList({
  tabs,
  spaceId,
  onTabClick,
  showAddButton = true,
  maxVisible = 8,
}: TabPreviewListProps) {
  const visibleTabs = tabs.slice(0, maxVisible);
  const hiddenCount = tabs.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTabs.map((tab) => (
        <TabPreviewIcon
          key={tab.id}
          tab={tab}
          onClick={() => onTabClick(tab.id)}
        />
      ))}

      {hiddenCount > 0 && (
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs text-muted-foreground">
          +{hiddenCount}
        </div>
      )}

      {showAddButton && (
        <AddTabPopover spaceId={spaceId}>
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </AddTabPopover>
      )}

      {tabs.length === 0 && !showAddButton && (
        <p className="text-xs text-muted-foreground py-1">No tabs yet</p>
      )}
    </div>
  );
}
