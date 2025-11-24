import { useSnapshot } from 'valtio';
import { FileText, Plus } from 'lucide-react';
import { notesStore, notesActions } from '@/stores/notes.store';
import { NotesEditor } from './NotesEditor';
import { NotesSidebar } from './NotesSidebar';
import { Button } from '@/components/ui/button';

interface NotesViewProps {
  spaceId: string;
  // Hybrid mode: if noteId is provided, show just the editor (tab mode)
  // if not provided, show sidebar + editor (panel mode)
  noteId?: string;
  viewMode?: 'tab' | 'panel';
}

export function NotesView({ spaceId, noteId, viewMode = 'panel' }: NotesViewProps) {
  const snap = useSnapshot(notesStore);

  // Determine which note to show
  const activeNoteId = noteId || snap.activeNoteId;

  // In tab mode, show just the editor for the specific note
  if (viewMode === 'tab' && noteId) {
    return (
      <div className="h-full w-full">
        <NotesEditor noteId={noteId} />
      </div>
    );
  }

  // In panel mode, show sidebar + editor (Obsidian-like)
  return (
    <div className="h-full w-full flex">
      {/* Sidebar */}
      {!snap.sidebarCollapsed && (
        <div className="w-64 shrink-0">
          <NotesSidebar spaceId={spaceId} />
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1">
        {activeNoteId ? (
          <NotesEditor key={activeNoteId} noteId={activeNoteId} />
        ) : (
          <EmptyState spaceId={spaceId} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ spaceId }: { spaceId: string }) {
  const handleCreateNote = () => {
    // Create with default name, user can rename later
    notesActions.createNote(spaceId, 'untitled.md');
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <FileText size={64} className="mx-auto mb-6 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-semibold mb-2">No note selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a note from the sidebar or create a new one to get started
        </p>
        <Button onClick={handleCreateNote} size="lg">
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
