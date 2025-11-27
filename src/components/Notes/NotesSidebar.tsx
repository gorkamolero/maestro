import { useState } from 'react';
import { useSnapshot } from 'valtio';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Pin,
  MoreVertical,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notesStore, notesActions, notesComputed, TreeNode } from '@/stores/notes.store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NotesSidebarProps {
  spaceId: string;
}

export function NotesSidebar({ spaceId }: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Subscribe to store changes to trigger re-renders when notes/folders change
  const snap = useSnapshot(notesStore);

  // Build tree from snapshot data to ensure reactivity
  const tree = notesComputed.buildTree(spaceId);
  const pinnedNotes = snap.notes.filter((n) => n.spaceId === spaceId && n.isPinned);

  const handleNewNote = () => {
    setIsCreatingNote(true);
    setNewItemName('untitled.md');
  };

  const handleNewFolder = () => {
    setIsCreatingFolder(true);
    setNewItemName('New Folder');
  };

  const handleCreateNote = () => {
    if (newItemName.trim()) {
      notesActions.createNote(spaceId, newItemName.trim());
      setIsCreatingNote(false);
      setNewItemName('');
    }
  };

  const handleCreateFolder = () => {
    if (newItemName.trim()) {
      notesActions.createFolder(spaceId, newItemName.trim());
      setIsCreatingFolder(false);
      setNewItemName('');
    }
  };

  const handleCancelCreate = () => {
    setIsCreatingNote(false);
    setIsCreatingFolder(false);
    setNewItemName('');
  };

  // Filter tree if searching
  const filteredTree = searchQuery ? tree.filter((node) => filterNode(node, searchQuery)) : tree;

  return (
    <div className="notes-sidebar h-full flex flex-col bg-background border-r border-border">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-muted/50"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-b border-border flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewNote}
          className="flex-1 justify-start text-xs"
        >
          <Plus size={14} className="mr-1" />
          New Note
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewFolder}
          className="flex-1 justify-start text-xs"
        >
          <FolderPlus size={14} className="mr-1" />
          New Folder
        </Button>
      </div>

      {/* Inline Creation UI */}
      {(isCreatingNote || isCreatingFolder) && (
        <div className="p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1 mb-1">
            {isCreatingNote ? (
              <FileText size={14} className="text-muted-foreground" />
            ) : (
              <Folder size={14} className="text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isCreatingNote ? 'New Note' : 'New Folder'}
            </span>
          </div>
          <Input
            autoFocus
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                isCreatingNote ? handleCreateNote() : handleCreateFolder();
              } else if (e.key === 'Escape') {
                handleCancelCreate();
              }
            }}
            placeholder={isCreatingNote ? 'note-name.md' : 'Folder name'}
            className="mb-2 h-8 text-sm"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              onClick={isCreatingNote ? handleCreateNote : handleCreateFolder}
              className="flex-1 h-7 text-xs"
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelCreate}
              className="flex-1 h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pinned Section */}
      {pinnedNotes.length > 0 && (
        <div className="border-b border-border">
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Pin size={12} />
            PINNED
          </div>
          {pinnedNotes.map((note) => (
            <NoteItem key={note.id} noteId={note.id} />
          ))}
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">FILES</div>
        {filteredTree.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p>No notes yet</p>
            <button onClick={handleNewNote} className="mt-2 text-xs text-primary hover:underline">
              Create your first note
            </button>
          </div>
        ) : (
          filteredTree.map((node) => <TreeNodeComponent key={node.id} node={node} level={0} />)
        )}
      </div>

      {/* Tags Section */}
      {notesComputed.getAllTags().length > 0 && (
        <div className="border-t border-border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">TAGS</div>
          <div className="flex flex-wrap gap-1">
            {notesComputed.getAllTags().map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-muted rounded-full hover:bg-muted/80 cursor-pointer"
                onClick={() => setSearchQuery(`#${tag}`)}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Tree Node Component
interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
}

function TreeNodeComponent({ node, level }: TreeNodeComponentProps) {
  const snap = useSnapshot(notesStore);

  // Get the current name from the store (reactive) instead of the static node object
  const currentItem =
    node.type === 'note'
      ? snap.notes.find((n) => n.id === node.id)
      : snap.folders.find((f) => f.id === node.id);

  const displayName = currentItem?.name ?? node.name;
  const isPinned = node.type === 'note' ? (currentItem as (typeof snap.notes)[0])?.isPinned : false;
  const isExpanded =
    node.type === 'folder' ? (currentItem as (typeof snap.folders)[0])?.expanded : false;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === 'folder') {
      notesActions.toggleFolder(node.id);
    }
  };

  const handleSelect = () => {
    if (node.type === 'note') {
      notesActions.setActiveNote(node.id);
    }
  };

  const handleDelete = () => {
    if (confirm(`Delete ${displayName}?`)) {
      if (node.type === 'note') {
        notesActions.deleteNote(node.id);
      } else {
        notesActions.deleteFolder(node.id);
      }
    }
  };

  const handleRename = () => {
    const newName = window.prompt('Rename:', displayName);
    if (newName && newName !== displayName) {
      if (node.type === 'note') {
        notesActions.renameNote(node.id, newName);
      } else {
        notesActions.renameFolder(node.id, newName);
      }
    }
  };

  const handlePin = () => {
    if (node.type === 'note') {
      notesActions.togglePin(node.id);
    }
  };

  const isActive = snap.activeNoteId === node.id;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 hover:bg-muted/50 cursor-pointer text-sm group',
          isActive && 'bg-muted border-l-2 border-primary'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Chevron for folders */}
        {node.type === 'folder' && (
          <button onClick={handleToggle} className="p-0.5 hover:bg-muted rounded">
            {isExpanded ? (
              <ChevronDown size={12} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={12} className="text-muted-foreground" />
            )}
          </button>
        )}

        {/* Icon */}
        {node.type === 'folder' ? (
          isExpanded ? (
            <FolderOpen size={14} className="text-muted-foreground shrink-0" />
          ) : (
            <Folder size={14} className="text-muted-foreground shrink-0" />
          )
        ) : (
          <FileText size={14} className="text-muted-foreground shrink-0" />
        )}

        {/* Name */}
        <span className="flex-1 truncate">{displayName}</span>

        {/* Pin indicator */}
        {isPinned && <Pin size={12} className="text-primary shrink-0" />}

        {/* Context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded shrink-0"
            >
              <MoreVertical size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
            {node.type === 'note' && (
              <DropdownMenuItem onClick={handlePin}>{isPinned ? 'Unpin' : 'Pin'}</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 size={14} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}

// Note Item (for pinned section)
function NoteItem({ noteId }: { noteId: string }) {
  const snap = useSnapshot(notesStore);
  const note = snap.notes.find((n) => n.id === noteId);

  if (!note) return null;

  const isActive = snap.activeNoteId === noteId;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1 hover:bg-muted/50 cursor-pointer text-sm',
        isActive && 'bg-muted border-l-2 border-primary'
      )}
      onClick={() => notesActions.setActiveNote(noteId)}
    >
      <FileText size={14} className="text-muted-foreground" />
      <span className="flex-1 truncate">{note.name}</span>
    </div>
  );
}

// Helper to filter tree nodes by search query
function filterNode(node: TreeNode, query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Check if node name matches
  if (node.name.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check if any children match
  if (node.children) {
    return node.children.some((child) => filterNode(child, query));
  }

  return false;
}
