import { useState, useEffect } from 'react';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { StatusBar } from '@/components/StatusBar';
import { ControlRoom } from '@/components/ControlRoom';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { historyActions } from '@/stores/history.store';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { applySpaceTheme, resetSpaceTheme } from '@/lib/space-theme';
import { startAutoBackup } from '@/lib/backup';
import '@/components/editor/themes/editor-theme.css';

// Start automatic database backups
startAutoBackup();

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeSpaceId, activeTabId, appViewMode } = useWorkspaceStore();
  const { spaces } = useSpacesStore();

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  // Update lastActiveAt when switching to a space
  useEffect(() => {
    if (activeSpaceId && appViewMode === 'workspace') {
      spacesActions.updateSpaceLastActive(activeSpaceId);
    }
  }, [activeSpaceId, appViewMode]);

  // Apply space theme when active space changes
  useEffect(() => {
    if (activeSpace) {
      applySpaceTheme(activeSpace.primaryColor, activeSpace.secondaryColor);
    } else {
      resetSpaceTheme();
    }
  }, [activeSpace]);

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
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

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
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [activeTabId]);

  // ControlRoom is always rendered - ExpandableScreen handles workspace view
  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <div className="flex-1 overflow-hidden">
        <ControlRoom />
      </div>
      <StatusBar />
      <CommandPalettePortal isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}

export default App;
