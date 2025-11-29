import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { StatusBar } from '@/components/StatusBar';
import { ControlRoom } from '@/components/ControlRoom';
import { WindowManager } from '@/components/Window';
import { SpaceSync } from '@/components/SpaceSync';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { useWindowsStore, windowsActions, getWindowsStore } from '@/stores/windows.store';
import { historyActions } from '@/stores/history.store';
import { usePerformanceMonitor } from '@/hooks/usePerformance';
import { startAutoBackup } from '@/lib/backup';
import { initializeAgentMonitor } from '@/lib/agent-monitor-init';
import { getRemoteViewManager } from './renderer/remote-view';
import '@/components/editor/themes/editor-theme.css';

// Start automatic database backups
startAutoBackup();

// Initialize agent monitor (connects saved repos)
initializeAgentMonitor();

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeTabId } = useWorkspaceStore();
  // Windows store subscription (focusedWindowId used for potential future focus indicators)
  useWindowsStore();

  // Initialize performance monitoring (collects metrics every 2s)
  usePerformanceMonitor(2000);

  // Initialize Remote View
  useEffect(() => {
    const manager = getRemoteViewManager();

    // Set up signal forwarding to main process
    manager.onSignal((clientId, signal) => {
      window.remoteView.sendSignal(clientId, signal);
    });

    // Listen for viewer connections from main
    // handleViewerConnect is now async and handles capture internally
    const unsubConnect = window.remoteView.onViewerConnected(async (clientId, browserId, quality) => {
      await manager.handleViewerConnect(clientId, browserId, quality as 'low' | 'medium' | 'high');
    });

    // Listen for incoming signals from mobile
    const unsubSignal = window.remoteView.onSignal((clientId, signal) => {
      manager.handleSignal(clientId, signal as any);
    });

    // Listen for viewer disconnections
    const unsubDisconnect = window.remoteView.onViewerDisconnected((clientId) => {
      manager.disconnectViewer(clientId);

      // Stop capture if no more viewers
      if (manager.getSessionCount() === 0) {
        manager.stopCapture();
      }
    });

    return () => {
      unsubConnect();
      unsubSignal();
      unsubDisconnect();
      manager.destroy();
    };
  }, []);

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
      <SpaceSync />
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
