import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { StatusBar } from '@/components/StatusBar';
import { ControlRoom } from '@/components/ControlRoom';
import { WindowManager } from '@/components/Window';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { useWindowsStore, windowsActions, getWindowsStore } from '@/stores/windows.store';
import { historyActions } from '@/stores/history.store';
import { agentActions, type AgentStatus } from '@/stores/agent.store';
import { usePerformanceMonitor } from '@/hooks/usePerformance';
import { startAutoBackup } from '@/lib/backup';
import '@/components/editor/themes/editor-theme.css';

// Start automatic database backups
startAutoBackup();

// Global agent IPC subscription hook
function useAgentIpcSubscription() {
  useEffect(() => {
    // Subscribe to agent status updates
    const unsubStatus = window.agent?.onStatus(
      (data: { sessionId: string; status: string; error?: string }) => {
        agentActions.updateStatus(data.sessionId, data.status as AgentStatus, data);
      }
    );

    // Subscribe to agent terminal output
    const unsubTerminal = window.agent?.onTerminalLine(
      (data: { sessionId: string; line: string }) => {
        agentActions.appendTerminalLine(data.sessionId, data.line);
      }
    );

    return () => {
      unsubStatus?.();
      unsubTerminal?.();
    };
  }, []);
}

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeTabId } = useWorkspaceStore();
  // Windows store subscription (focusedWindowId used for potential future focus indicators)
  useWindowsStore();

  // Subscribe to agent IPC events globally
  useAgentIpcSubscription();

  // Initialize performance monitoring (collects metrics every 2s)
  usePerformanceMonitor(2000);

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Global keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl/Cmd+Z - Undo
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (isInputField) return;
        e.preventDefault();
        historyActions.undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z - Redo
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (isInputField) return;
        e.preventDefault();
        historyActions.redo();
        return;
      }

      // Shift+Cmd+T - Restore most recent closed tab
      if (e.key === 't' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        workspaceActions.restoreRecentlyClosedTab();
        return;
      }

      // Cmd+W - Close active tab
      if (e.key === 'w' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId) {
          workspaceActions.closeTab(activeTabId);
        }
        return;
      }

      // Cmd+K or Cmd+T - Open command palette
      if ((e.key === 'k' || e.key === 't') && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }

      // ============================================================================
      // Window Management Shortcuts
      // ============================================================================

      const windowsStore = getWindowsStore();

      // ESC - Close focused floating window
      if (e.key === 'Escape' && windowsStore.focusedWindowId) {
        const focusedWindow = windowsStore.windows.find(
          (w) => w.id === windowsStore.focusedWindowId
        );
        if (focusedWindow?.mode === 'floating') {
          e.preventDefault();
          windowsActions.closeWindow(windowsStore.focusedWindowId);
          return;
        }
      }

      // Cmd+` or Cmd+Shift+` - Cycle through floating windows
      if (e.key === '`' && (e.metaKey || e.ctrlKey)) {
        const hasFloatingWindows = windowsStore.windows.some(
          (w) => w.mode === 'floating' && !w.isMinimized
        );
        if (hasFloatingWindows) {
          e.preventDefault();
          if (e.shiftKey) {
            windowsActions.cycleFocusPrev();
          } else {
            windowsActions.cycleFocusNext();
          }
          return;
        }
      }

      // Cmd+M - Minimize focused window
      if (e.key === 'm' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (windowsStore.focusedWindowId) {
          e.preventDefault();
          windowsActions.minimizeWindow(windowsStore.focusedWindowId);
          return;
        }
      }

      // Cmd+Enter - Toggle maximized/floating for focused window
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        if (windowsStore.focusedWindowId) {
          e.preventDefault();
          windowsActions.toggleMode(windowsStore.focusedWindowId);
          return;
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [activeTabId]);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ControlRoom />
      </div>
      <StatusBar />

      {/* Window Manager - renders all floating and maximized windows */}
      <WindowManager />

      <CommandPalettePortal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          },
        }}
      />
    </div>
  );
}

export default App;
