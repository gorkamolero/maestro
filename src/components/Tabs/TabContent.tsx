import { useSnapshot } from 'valtio';
import { tabsStore } from '@/stores/tabs.store';
import { Terminal, Globe, Bot, FileText } from 'lucide-react';

const CONTENT_ICONS = {
  terminal: Terminal,
  browser: Globe,
  agent: Bot,
  note: FileText,
  external: FileText,
  planted: FileText,
};

export function TabContent() {
  const { tabs, activeTabId } = useSnapshot(tabsStore);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p className="text-sm">No tab selected. Click a segment to open it.</p>
      </div>
    );
  }

  const Icon = CONTENT_ICONS[activeTab.type];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <Icon className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-semibold mb-2">{activeTab.title}</h2>
      <p className="text-muted-foreground capitalize">{activeTab.type} Segment</p>
      <p className="text-sm text-muted-foreground mt-4">
        Content area for {activeTab.type} segments will be implemented in Phase 2
      </p>
    </div>
  );
}
