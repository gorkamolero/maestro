import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Dock } from '@/components/Workspace/Dock';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';
import { NotesEditor } from '@/components/Notes/NotesEditor';
import { AddFavoriteModal } from '@/components/Launcher';
import { CommandPalettePortal } from '@/components/CommandPalettePortal';
import { workspaceStore } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { notesStore } from '@/stores/notes.store';
import { ResizablePanel } from '@/components/ui/resizable-panel';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notesActions } from '@/stores/notes.store';
import '@/components/editor/themes/editor-theme.css';

function App() {
  const [darkMode] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { activeSpaceId, layout, workspaceViewMode } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId);

  useEffect(() => {
    // Active space changed
  }, [activeSpaceId]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Cmd+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSidebarResize = (width: number) => {
    workspaceStore.layout.sidebarWidth = width;
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Thin space name bar at the very top */}
      <div className="h-4 flex items-center px-4 bg-muted/30 border-b border-border/50">
        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
          {activeSpace?.name || ''}
        </span>
      </div>

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
