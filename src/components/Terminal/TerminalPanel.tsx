import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TerminalTab, type TerminalTabData } from './TerminalTab';
import type { TerminalTheme } from './XTermWrapper';
import type { TerminalState } from './terminal.utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Terminal as TerminalIcon,
  Trash2,
  Copy,
  Download,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Tab management
  const [tabs, setTabs] = useState<TerminalTabData[]>([
    {
      id: crypto.randomUUID(),
      title: 'Terminal 1',
      workingDir: initialState?.workingDir || null,
      isActive: true,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  // Handle state changes
  const handleStateChange = useCallback(
    (tabId: string) => (state: TerminalState) => {
      // Update tab working directory
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId ? { ...tab, workingDir: state.workingDir } : tab
        )
      );

      if (onStateChange) {
        onStateChange({ ...state, theme });
      }
    },
    [theme, onStateChange]
  );

  // Create new tab
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

  // Close tab
  const handleCloseTab = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (tabs.length === 1) {
        // Don't close the last tab
        return;
      }

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

  // Update tab title
  const handleTabTitleChange = useCallback((tabId: string, title: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, title } : tab))
    );
  }, []);

  // Download terminal buffer
  const handleDownload = useCallback(async () => {
    try {
      const buffer = await invoke('get_terminal_buffer', {
        segmentId: `${segmentId}-${activeTabId}`,
      });
      const blob = new Blob([buffer as string], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-${segmentId}-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download terminal buffer:', error);
    }
  }, [segmentId, activeTabId]);

  // Copy terminal buffer to clipboard
  const handleCopy = useCallback(async () => {
    try {
      const buffer = await invoke('get_terminal_buffer', {
        segmentId: `${segmentId}-${activeTabId}`,
      });
      await navigator.clipboard.writeText(buffer as string);
    } catch (error) {
      console.error('Failed to copy terminal buffer:', error);
    }
  }, [segmentId, activeTabId]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="terminal-panel h-full w-full flex flex-col">
      {/* Terminal Header with Glass Morphism */}
      <div
        className="terminal-header flex items-center justify-between gap-2 px-4 py-2 border-b"
        style={{
          background: 'rgba(30, 30, 30, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: Terminal Info */}
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {activeTab?.workingDir || activeTab?.title || 'Terminal'}
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <Select
            value={theme}
            onValueChange={(value) => setTheme(value as TerminalTheme)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="termius-dark">Termius Dark</SelectItem>
              <SelectItem value="dracula">Dracula</SelectItem>
              <SelectItem value="nord">Nord</SelectItem>
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            title="Copy buffer"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDownload}
            title="Download buffer"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="tab-bar flex items-center gap-1 px-2 py-1 border-b overflow-x-auto"
        style={{
          background: 'rgba(20, 20, 20, 0.9)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors group',
              tab.id === activeTabId
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'hover:bg-muted text-muted-foreground'
            )}
            role="tab"
            aria-selected={tab.id === activeTabId}
            id={`terminal-tab-${tab.id}`}
          >
            <span className="truncate max-w-[120px]">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 rounded p-0.5"
                title="Close tab"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto flex-shrink-0"
          onClick={handleNewTab}
          title="New terminal"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Terminal Content with Glass Morphism */}
      <div
        className="terminal-content flex-1 overflow-hidden relative"
        style={{
          background: 'rgba(15, 15, 15, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        {tabs.map((tab) => (
          <TerminalTab
            key={tab.id}
            tab={tab}
            segmentId={segmentId}
            theme={theme}
            initialState={tab.id === tabs[0].id ? initialState : undefined}
            isActive={tab.id === activeTabId}
            onClose={() => handleCloseTab(tab.id, {} as React.MouseEvent)}
            onStateChange={handleStateChange(tab.id)}
            onTitleChange={(title) => handleTabTitleChange(tab.id, title)}
          />
        ))}
      </div>
    </div>
  );
}
