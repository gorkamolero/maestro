import { useState, useCallback } from 'react';
import { TerminalTab } from './TerminalTab';
import { TerminalHeader } from './TerminalHeader';
import { TerminalTabBar } from './TerminalTabBar';
import { useTerminalTabs } from './hooks/useTerminalTabs';
import type { TerminalTheme } from './XTermWrapper';
import type { TerminalState } from './terminal.utils';

interface TerminalPanelProps {
  segmentId: string;
  initialState?: TerminalState;
  onStateChange?: (state: TerminalState) => void;
}

export function TerminalPanel({
  segmentId,
  initialState,
  onStateChange,
}: TerminalPanelProps) {
  const [theme, setTheme] = useState<TerminalTheme>(
    initialState?.theme || 'termius-dark'
  );

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    handleNewTab,
    handleCloseTab,
    handleTabTitleChange,
    handleTabWorkingDirChange,
  } = useTerminalTabs(initialState?.workingDir);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleStateChange = useCallback(
    (state: TerminalState) => {
      // Update tab working directory if changed
      if (activeTabId && state.workingDir) {
        handleTabWorkingDirChange(activeTabId, state.workingDir);
      }

      onStateChange?.(state);
    },
    [activeTabId, handleTabWorkingDirChange, onStateChange]
  );

  return (
    <div
      className="terminal-panel flex flex-col h-full w-full rounded-lg overflow-hidden shadow-2xl"
      style={{
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <TerminalHeader
        workingDir={activeTab?.workingDir || null}
        theme={theme}
        onThemeChange={setTheme}
      />

      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={handleCloseTab}
        onNewTab={handleNewTab}
      />

      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TerminalTab
            key={tab.id}
            tab={tab}
            segmentId={segmentId}
            theme={theme}
            initialState={tab.id === tabs[0].id ? initialState : undefined}
            isActive={tab.id === activeTabId}
            onClose={() => handleCloseTab(tab.id)}
            onStateChange={handleStateChange}
            onTitleChange={(title) => handleTabTitleChange(tab.id, title)}
          />
        ))}
      </div>
    </div>
  );
}
