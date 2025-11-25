import { useEffect, useCallback } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { Space } from '@/types';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { TerminalPanel } from '@/components/Terminal/TerminalPanel';
import { BrowserPanel } from '@/components/Browser/BrowserPanel';
import { TasksView } from '@/components/Tasks/TasksView';
import { NotesView } from '@/components/Notes/NotesView';
import { NextBubble } from './NextBubble';
import { TabTypeIcon } from './TabPreview';
import type { TerminalState } from '@/components/Terminal/terminal.utils';

interface MaximizedTabProps {
  tab: Tab;
  space: Space;
  onBack: () => void;
}

export function MaximizedTab({ tab, space, onBack }: MaximizedTabProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleNextChange = useCallback(
    (next: string | null) => {
      spacesActions.setSpaceNext(space.id, next);
    },
    [space.id]
  );

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Minimal Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] shrink-0">
        <TabTypeIcon type={tab.type} />
        <span className="font-medium text-sm">{tab.title}</span>

        <span className="text-xs text-muted-foreground">
          in {space.icon || '📁'} {space.name}
        </span>

        <div className="flex-1" />

        {/* NEXT bubble inline */}
        <div className="max-w-[200px]">
          <NextBubble
            value={space.next}
            onChange={handleNextChange}
            placeholder="What's next?"
          />
        </div>

        {/* Close button */}
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Close"
        >
          <Cross2Icon className="h-4 w-4" />
        </button>
      </header>

      {/* Tab content - full screen */}
      <div className="flex-1 overflow-hidden">
        <TabContent tab={tab} />
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  switch (tab.type) {
    case 'terminal':
      return (
        <div className="w-full h-full pt-4 pr-4">
          <TerminalPanel
            segmentId={tab.id}
            initialState={
              tab.terminalState
                ? {
                    buffer: tab.terminalState.buffer || '',
                    workingDir: tab.terminalState.workingDir || null,
                    scrollPosition: tab.terminalState.scrollPosition || 0,
                    theme: tab.terminalState.theme || 'termius-dark',
                  }
                : undefined
            }
            onStateChange={(state: TerminalState) => {
              workspaceActions.updateTabTerminalState(tab.id, state);
            }}
          />
        </div>
      );

    case 'browser':
      return (
        <div className="w-full h-full flex flex-col">
          <BrowserPanel tab={tab} isActive={true} />
        </div>
      );

    case 'tasks':
      return (
        <div className="w-full h-full">
          <TasksView boardTabId={tab.id} />
        </div>
      );

    case 'notes':
      return (
        <div className="w-full h-full">
          <NotesView spaceId={tab.spaceId} viewMode="panel" />
        </div>
      );

    case 'app-launcher':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">
              App: {tab.appLauncherConfig?.appName || tab.title}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              External apps run in their own windows
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Unsupported tab type: {tab.type}
          </p>
        </div>
      );
  }
}
