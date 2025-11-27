import { useEffect, useMemo } from 'react';
import { PictureInPicture2, X } from 'lucide-react';
import { useWindowsStore, windowsActions } from '@/stores/windows.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { FloatingWindow, TITLE_BAR_HEIGHT } from './FloatingWindow';
import { WindowContent } from './WindowContent';

/**
 * WindowManager is the root component that renders all open windows.
 * It manages the window layer and coordinates between the windows store
 * and the actual rendering.
 */
export function WindowManager() {
  const { windows, focusedWindowId } = useWindowsStore();
  const { tabs } = useWorkspaceStore();

  // Validate windows on mount (remove orphaned windows)
  useEffect(() => {
    windowsActions.validateWindows();
  }, []);

  // Sort windows by z-index for correct rendering order
  const sortedWindows = useMemo(() => {
    return [...windows]
      .filter((w) => !w.isMinimized)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [windows]);

  // Get floating windows (not maximized)
  const floatingWindows = useMemo(() => {
    return sortedWindows.filter((w) => w.mode === 'floating');
  }, [sortedWindows]);

  // Get maximized window (only show the topmost one)
  const maximizedWindow = useMemo(() => {
    const maximizedWindows = sortedWindows.filter((w) => w.mode === 'maximized');
    return maximizedWindows.length > 0 ? maximizedWindows[maximizedWindows.length - 1] : null;
  }, [sortedWindows]);

  // Get minimized windows for the dock
  const minimizedWindows = useMemo(() => {
    return windows.filter((w) => w.isMinimized);
  }, [windows]);

  // Helper to get tab for a window
  const getTab = (tabId: string) => tabs.find((t) => t.id === tabId);

  return (
    <>
      {/* Maximized view layer */}
      {maximizedWindow && (
        <MaximizedView
          window={maximizedWindow}
          tab={getTab(maximizedWindow.tabId)}
          isFocused={maximizedWindow.id === focusedWindowId}
        />
      )}

      {/* Floating windows layer */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
        {floatingWindows.map((window) => {
          const tab = getTab(window.tabId);
          if (!tab) return null;

          return (
            <div key={window.id} className="pointer-events-auto">
              <FloatingWindow
                window={window}
                tab={tab}
                isFocused={window.id === focusedWindowId}
              >
                <WindowContent
                  tab={tab}
                  width={window.size.width}
                  height={window.size.height - TITLE_BAR_HEIGHT}
                />
              </FloatingWindow>
            </div>
          );
        })}
      </div>

      {/* Minimized windows dock */}
      {minimizedWindows.length > 0 && (
        <MinimizedDock windows={minimizedWindows} tabs={tabs} />
      )}
    </>
  );
}

/**
 * MaximizedView renders a single tab in full-screen mode
 */
function MaximizedView({
  window,
  tab,
  isFocused,
}: {
  window: { id: string; tabId: string };
  tab: ReturnType<typeof useWorkspaceStore>['tabs'][0] | undefined;
  isFocused: boolean;
}) {
  if (!tab) return null;

  const handleClose = () => {
    windowsActions.closeWindow(window.id);
  };

  const handleFloat = () => {
    windowsActions.setMode(window.id, 'floating');
  };

  return (
    <div
      className={`fixed inset-0 bg-background flex flex-col ${isFocused ? '' : 'opacity-95'}`}
      style={{ zIndex: 50 }}
      onClick={() => windowsActions.focusWindow(window.id)}
    >
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {tab.emoji && <span className="text-sm">{tab.emoji}</span>}
          <span className="text-sm font-medium">{tab.title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFloat();
            }}
            className="p-1.5 rounded hover:bg-white/[0.08] transition-colors"
            title="Float"
          >
            <PictureInPicture2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="p-1.5 rounded hover:bg-destructive/20 transition-colors group"
            title="Close"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-destructive" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <WindowContent
          tab={tab}
          width={window.innerWidth}
          height={window.innerHeight - 40}
        />
      </div>
    </div>
  );
}

/**
 * MinimizedDock shows minimized windows as small buttons at the bottom
 */
function MinimizedDock({
  windows,
  tabs,
}: {
  windows: ReturnType<typeof useWindowsStore>['windows'];
  tabs: ReturnType<typeof useWorkspaceStore>['tabs'];
}) {
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur rounded-lg border border-white/[0.08] shadow-lg"
      style={{ zIndex: 200 }}
    >
      {windows.map((window) => {
        const tab = tabs.find((t) => t.id === window.tabId);
        if (!tab) return null;

        return (
          <button
            key={window.id}
            onClick={() => windowsActions.restoreWindow(window.id)}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.08] transition-colors"
            title={`Restore ${tab.title}`}
          >
            {tab.emoji ? (
              <span className="text-sm">{tab.emoji}</span>
            ) : (
              <span className="text-xs opacity-60">
                {tab.type === 'browser' ? '🌐' : tab.type === 'terminal' ? '⌨️' : '📄'}
              </span>
            )}
            <span className="text-xs text-muted-foreground max-w-[100px] truncate">
              {tab.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
