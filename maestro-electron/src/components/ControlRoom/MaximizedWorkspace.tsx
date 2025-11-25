import { useEffect, useCallback } from 'react';
import { ChevronLeft, FileText, Plus } from 'lucide-react';
import type { Space } from '@/types';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { Sidebar } from '@/components/Workspace/Sidebar';
import { WorkspacePanel } from '@/components/Workspace/WorkspacePanel';
import { NotesEditor } from '@/components/Notes/NotesEditor';
import { notesStore, notesActions } from '@/stores/notes.store';
import { useSnapshot } from 'valtio';
import { NextBubble } from './NextBubble';
import { ResizablePanel } from '@/components/ui/resizable-panel';
import { getWorkspaceStore } from '@/stores/workspace.store';
import { Button } from '@/components/ui/button';

interface MaximizedWorkspaceProps {
  space: Space;
  onBack: () => void;
}

export function MaximizedWorkspace({ space, onBack }: MaximizedWorkspaceProps) {
  const { layout, workspaceViewMode } = useWorkspaceStore();
  const notesSnap = useSnapshot(notesStore);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
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

  const handleSidebarResize = (width: number) => {
    getWorkspaceStore().layout.sidebarWidth = width;
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Minimal Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-base">{space.icon || '📁'}</span>
        <span className="font-medium text-sm">{space.name}</span>

        <div className="flex-1" />

        {/* NEXT bubble inline */}
        <div className="max-w-[200px]">
          <NextBubble
            value={space.next}
            onChange={handleNextChange}
            placeholder="What's next?"
          />
        </div>
      </header>

      {/* Workspace Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ResizablePanel
          defaultWidth={layout.sidebarWidth}
          minWidth={180}
          maxWidth={400}
          onResize={handleSidebarResize}
          className="bg-muted/20"
        >
          <Sidebar />
        </ResizablePanel>

        {/* Main content area */}
        <div className="flex-1 bg-muted/20">
          <div className="h-full flex flex-col rounded-lg overflow-hidden bg-background">
            {workspaceViewMode === 'tabs' ? (
              <WorkspacePanel />
            ) : notesSnap.activeNoteId ? (
              <NotesEditor key={notesSnap.activeNoteId} noteId={notesSnap.activeNoteId} />
            ) : (
              <EmptyNotesState spaceId={space.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Empty state for notes
function EmptyNotesState({ spaceId }: { spaceId: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <FileText size={64} className="mx-auto mb-6 text-muted-foreground opacity-50" />
        <h2 className="text-2xl font-semibold mb-2">No note selected</h2>
        <p className="text-muted-foreground mb-6">
          Select a note from the sidebar or create a new one
        </p>
        <Button onClick={() => notesActions.createNote(spaceId, 'untitled.md')} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create New Note
        </Button>
      </div>
    </div>
  );
}
