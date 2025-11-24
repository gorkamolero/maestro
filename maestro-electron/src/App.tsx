import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Dock } from '@/components/Workspace/Dock';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';
import { NotesEditor } from '@/components/Notes/NotesEditor';
import { AddFavoriteModal } from '@/components/Launcher';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { StatusBar } from '@/components/StatusBar';
import { useWorkspaceStore, workspaceActions, getWorkspaceStore } from '@/stores/workspace.store';
import { historyActions } from '@/stores/history.store';
import { useSpacesStore } from '@/stores/spaces.store';
import { notesStore } from '@/stores/notes.store';
import { ResizablePanel } from '@/components/ui/resizable-panel';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notesActions } from '@/stores/notes.store';
import { applySpaceTheme, resetSpaceTheme } from '@/lib/space-theme';
import { startAutoBackup } from '@/lib/backup';
import '@/components/editor/themes/editor-theme.css';

// Start automatic database backups
startAutoBackup();

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeSpaceId, layout, workspaceViewMode } = useWorkspaceStore();
  const { spaces } = useSpacesStore();

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  useEffect(() => {
    // Apply space theme when active space changes
    if (activeSpace) {
      applySpaceTheme(activeSpace.primaryColor, activeSpace.secondaryColor);
    } else {
      resetSpaceTheme();
    }
  }, [activeSpace]);

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
      // Ctrl/Cmd+Z - Undo
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        // Don't intercept if user is in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        historyActions.undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z - Redo
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        // Don't intercept if user is in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
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

      // Cmd+K or Cmd+T - Open command palette
      if ((e.key === 'k' || e.key === 't') && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSidebarResize = (width: number) => {
    getWorkspaceStore().layout.sidebarWidth = width;
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Arc-style left sidebar - now resizable */}
        <ResizablePanel
        defaultWidth={layout.sidebarWidth}
        minWidth={180}
        maxWidth={400}
        onResize={handleSidebarResize}
        className="bg-muted/20"
      >
        <div className="h-full flex flex-col">
          {/* Sidebar with favorites and tabs */}
          <div className="flex-1 overflow-hidden">
            <Sidebar onCommandPalette={() => setCommandPaletteOpen(true)} />
          </div>

          {/* Space switcher at bottom-left */}
          <div className="p-2 border-t border-border/50">
            <Dock />
          </div>
        </div>
      </ResizablePanel>

      {/* Main workspace area */}
      <div className="flex-1 bg-muted/20">
        <div className="h-full flex flex-col rounded-lg overflow-hidden bg-background">
          {workspaceViewMode === 'tabs' ? (
            <WorkspacePanel />
          ) : activeSpaceId ? (
            <NotesMainArea spaceId={activeSpaceId} />
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {activeSpaceId && <AddFavoriteModal workspaceId={activeSpaceId} />}

        {/* Command Palette */}
        <CommandPalettePortal isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

// Notes main area - just the editor, no sidebar
function NotesMainArea({ spaceId }: { spaceId: string }) {
  const snap = useSnapshot(notesStore);
  const activeNoteId = snap.activeNoteId;

  if (activeNoteId) {
    return <NotesEditor key={activeNoteId} noteId={activeNoteId} />;
  }

  // Empty state when no note is selected
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <FileText size={64} className="mx-auto mb-6 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-semibold mb-2">No note selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a note from the sidebar or create a new one to get started
        </p>
        <Button onClick={() => notesActions.createNote(spaceId, 'untitled.md')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create New Note
        </Button>
        <div className="mt-8 text-sm text-muted-foreground">
          <p className="mb-2 font-medium">Quick tips:</p>
          <ul className="space-y-1 text-left mx-auto inline-block">
            <li>• Use Markdown shortcuts for formatting</li>
            <li>• Link notes to tasks for context</li>
            <li>• Organize with folders and tags</li>
            <li>• Pin important notes for quick access</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
