import { useState, useCallback } from 'react';

export interface TerminalTabData {
  id: string;
  title: string;
  workingDir: string | null;
  isActive: boolean;
}

export function useTerminalTabs(initialWorkingDir?: string | null) {
  const [tabs, setTabs] = useState<TerminalTabData[]>([
    {
      id: crypto.randomUUID(),
      title: 'Terminal 1',
      workingDir: initialWorkingDir || null,
      isActive: true,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const handleNewTab = useCallback(() => {
    const newTab: TerminalTabData = {
      id: crypto.randomUUID(),
      title: `Terminal ${tabs.length + 1}`,
      workingDir: null,
      isActive: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) return; // Don't close the last tab

      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== tabId);
        // If closing active tab, activate the first remaining tab
        if (tabId === activeTabId && filtered.length > 0) {
          setActiveTabId(filtered[0].id);
        }
        return filtered;
      });
    },
    [tabs.length, activeTabId]
  );

  const handleTabTitleChange = useCallback((tabId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, title: newTitle } : tab))
    );
  }, []);

  const handleTabWorkingDirChange = useCallback((tabId: string, workingDir: string | null) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, workingDir } : tab))
    );
  }, []);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    handleNewTab,
    handleCloseTab,
    handleTabTitleChange,
    handleTabWorkingDirChange,
  };
}
