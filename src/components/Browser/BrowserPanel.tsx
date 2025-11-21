import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserTab as BrowserTabType } from '@/types';
import { TabBar } from './TabBar';
import { BrowserTab } from './BrowserTab';
import { generateTabId } from './browser.utils';

interface BrowserPanelProps {
  tab: any; // Workspace tab (contains segment reference)
  onUpdate?: (tabs: BrowserTabType[]) => void;
}

export function BrowserPanel({ tab, onUpdate }: BrowserPanelProps) {
  // Initialize with tabs from segment config or create a default tab
  const [browserTabs, setBrowserTabs] = useState<BrowserTabType[]>(() => {
    const existingTabs = tab.segment?.config?.tabs;
    if (existingTabs && existingTabs.length > 0) {
      return existingTabs;
    }

    // Create initial tab
    return [
      {
        id: generateTabId(),
        url: 'about:blank',
        title: 'New Tab',
        favicon: undefined,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(browserTabs[0]?.id || '');

  // Sync tabs to parent when they change
  useEffect(() => {
    if (onUpdate) {
      onUpdate(browserTabs);
    }
  }, [browserTabs, onUpdate]);

  const handleTabAdd = () => {
    const newTab: BrowserTabType = {
      id: generateTabId(),
      url: 'about:blank',
      title: 'New Tab',
      favicon: undefined,
    };

    setBrowserTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabClose = (tabId: string) => {
    setBrowserTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);

      // If we closed the active tab, switch to another
      if (activeTabId === tabId && filtered.length > 0) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }

      // Always keep at least one tab
      if (filtered.length === 0) {
        const newTab: BrowserTabType = {
          id: generateTabId(),
          url: 'about:blank',
          title: 'New Tab',
          favicon: undefined,
        };
        setActiveTabId(newTab.id);
        return [newTab];
      }

      return filtered;
    });
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTabId(tabId);
  };

  const handleUrlChange = (tabId: string, url: string) => {
    setBrowserTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, url } : t
      )
    );
  };

  const handleTitleChange = (tabId: string, title: string) => {
    setBrowserTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, title } : t
      )
    );
  };

  const activeTab = browserTabs.find((t) => t.id === activeTabId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col bg-background"
    >
      {/* Tab bar */}
      <TabBar
        tabs={browserTabs}
        activeTabId={activeTabId}
        onTabSelect={handleTabSelect}
        onTabClose={handleTabClose}
        onTabAdd={handleTabAdd}
      />

      {/* Active tab content */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <BrowserTab
            key={activeTab.id}
            tab={activeTab}
            onUrlChange={(url) => handleUrlChange(activeTab.id, url)}
            onTitleChange={(title) => handleTitleChange(activeTab.id, title)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
