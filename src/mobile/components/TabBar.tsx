import React, { useRef, useEffect } from 'react';
import type { TabInfo } from '@shared/types';

interface TabBarProps {
  tabs: TabInfo[];
  activeTabId: string | null;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTabId, onTabChange }: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTabId]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-none"
    >
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : null}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/50 active:bg-white/10'
            }`}
          >
            <TabIcon type={tab.type} />
            <span className="text-sm truncate max-w-[120px]">
              {tab.title || getDefaultTitle(tab)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TabIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    browser: '🌐',
    terminal: '⬛',
    notes: '📝',
    agent: '🤖',
    app: '📱',
  };
  return <span className="text-xs">{icons[type] || '📄'}</span>;
}

function getDefaultTitle(tab: TabInfo): string {
  switch (tab.type) {
    case 'browser': return tab.url ? new URL(tab.url).hostname : 'New Tab';
    case 'terminal': return 'Terminal';
    case 'notes': return 'Notes';
    case 'agent': return 'Agent';
    default: return 'Tab';
  }
}
