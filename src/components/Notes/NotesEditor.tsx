import { SerializedEditorState } from 'lexical';
import { useSnapshot } from 'valtio';
import { FileText } from 'lucide-react';
import { notesStore, notesActions } from '@/stores/notes.store';
import { Editor } from '@/components/blocks/editor-x/editor';

interface NotesEditorProps {
  noteId: string;
}

// Empty initial state for new notes
const emptyEditorState = {
  root: {
    children: [
      {
        children: [],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
} as unknown as SerializedEditorState;

export function NotesEditor({ noteId }: NotesEditorProps) {
  const snap = useSnapshot(notesStore);
  const note = snap.notes.find((n) => n.id === noteId);

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Note not found</p>
        </div>
      </div>
    );
  }

  const handleChange = (value: SerializedEditorState) => {
    notesActions.updateNote(noteId, value);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Note Header */}
      <div className="border-b border-border p-4 bg-background/50">
        <input
          type="text"
          value={note.name}
          onChange={(e) => notesActions.renameNote(noteId, e.target.value)}
          className="text-2xl font-semibold bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
          placeholder="Untitled"
        />
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Modified {formatDate(note.modifiedAt)}</span>
          {note.linkedTaskIds.length > 0 && <span>{note.linkedTaskIds.length} linked tasks</span>}
          {note.tags.length > 0 && <span>{note.tags.length} tags</span>}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full">
          <Editor
            key={noteId}
            editorSerializedState={note.content || emptyEditorState}
            onSerializedChange={handleChange}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="border-t border-border px-4 py-2 flex justify-between text-xs text-muted-foreground bg-background/50">
        <div className="flex gap-4">
          <span>{note.path}</span>
        </div>
        <div className="flex gap-2">
          {note.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-muted rounded">
              #{tag}
            </span>
          ))}
          {note.tags.length === 0 && (
            <button
              className="hover:text-foreground"
              onClick={() => {
                const tag = prompt('Add tag:');
                if (tag) {
                  notesActions.addTag(noteId, tag);
                }
              }}
            >
              + Add tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
