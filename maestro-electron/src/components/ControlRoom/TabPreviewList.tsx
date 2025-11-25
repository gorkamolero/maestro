import type { Tab } from '@/stores/workspace.store';
import { TabPreview } from './TabPreview';

interface TabPreviewListProps {
  tabs: Tab[];
  onTabClick: (tabId: string) => void;
  maxVisible?: number;
}

export function TabPreviewList({
  tabs,
  onTabClick,
  maxVisible = 4,
}: TabPreviewListProps) {
  const visibleTabs = tabs.slice(0, maxVisible);
  const hiddenCount = tabs.length - maxVisible;

  if (tabs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">No tabs yet</p>
    );
  }

  return (
    <div className="space-y-0.5 mb-3">
      {visibleTabs.map((tab) => (
        <TabPreview
          key={tab.id}
          tab={tab}
          onClick={() => onTabClick(tab.id)}
        />
      ))}

      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground px-2 py-1">
          +{hiddenCount} more
        </p>
      )}
    </div>
  );
}
