import { persist } from 'valtio-persist';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';
import type { SerializedEditorState } from 'lexical';

// Types
export interface Note {
  id: string;
  spaceId: string;

  // File system
  path: string; // e.g., "/projects/roadie/api-design.md"
  name: string; // e.g., "api-design.md"
  parentId?: string; // Folder reference

  // Content
  content: SerializedEditorState | null; // Lexical JSON format
  markdown?: string; // Cached markdown version for search

  // Metadata
  createdAt: Date;
  modifiedAt: Date;
  accessedAt: Date;

  // Organization
  tags: string[];
  linkedNoteIds: string[]; // Note IDs
  linkedTaskIds: string[]; // Task IDs from tasks system
  linkedTabIds: string[]; // Tab IDs that reference this

  // Features
  isPinned: boolean;
  isTemplate: boolean;
}

export interface Folder {
  id: string;
  spaceId: string;
  path: string;
  name: string;
  parentId?: string;
  expanded: boolean;
  createdAt: Date;
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'note';
  path: string;
  children?: TreeNode[];
  isPinned?: boolean;
  isExpanded?: boolean;
}

interface NotesState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;

  // View state (not persisted)
  sidebarCollapsed: boolean;
  searchQuery: string;
  sortBy: 'name' | 'modified' | 'created';
}

// Create persisted store
const { store } = await persist<NotesState>(
  {
    notes: [],
    folders: [],
    activeNoteId: null,
    sidebarCollapsed: false,
    searchQuery: '',
    sortBy: 'modified',
  },
  'maestro-notes',
  {
    storageStrategy: IndexedDBStrategy,
    debounceTime: 1000,
    omit: ['sidebarCollapsed', 'searchQuery'], // Don't persist UI-only state
  }
);

export const notesStore = store;

// Computed values
export const notesComputed = {
  get notesBySpace(): Record<string, Note[]> {
    return notesStore.notes.reduce((acc, note) => {
      if (!acc[note.spaceId]) acc[note.spaceId] = [];
      acc[note.spaceId].push(note);
      return acc;
    }, {} as Record<string, Note[]>);
  },

  get recentNotes(): Note[] {
    return [...notesStore.notes]
      .sort((a, b) => new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
      .slice(0, 10);
  },

  get pinnedNotes(): Note[] {
    return notesStore.notes.filter((n) => n.isPinned);
  },

  getNotesBySpace(spaceId: string): Note[] {
    return notesStore.notes.filter((n) => n.spaceId === spaceId);
  },

  getNoteById(id: string): Note | undefined {
    return notesStore.notes.find((n) => n.id === id);
  },

  getFoldersBySpace(spaceId: string): Folder[] {
    return notesStore.folders.filter((f) => f.spaceId === spaceId);
  },

  // Build hierarchical tree structure
  buildTree(spaceId: string): TreeNode[] {
    const notes = notesComputed.getNotesBySpace(spaceId);
    const folders = notesComputed.getFoldersBySpace(spaceId);

    // Create a map for quick lookup
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // First, create folder nodes
    folders.forEach((folder) => {
      const node: TreeNode = {
        id: folder.id,
        name: folder.name,
        type: 'folder',
        path: folder.path,
        children: [],
        isExpanded: folder.expanded,
      };
      nodeMap.set(folder.id, node);
    });

    // Then create note nodes
    notes.forEach((note) => {
      const node: TreeNode = {
        id: note.id,
        name: note.name,
        type: 'note',
        path: note.path,
        isPinned: note.isPinned,
      };
      nodeMap.set(note.id, node);
    });

    // Build hierarchy
    nodeMap.forEach((node) => {
      const item = node.type === 'folder'
        ? folders.find((f) => f.id === node.id)
        : notes.find((n) => n.id === node.id);

      if (item?.parentId) {
        const parent = nodeMap.get(item.parentId);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort: folders first, then by name
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);
    return rootNodes;
  },

  // Get all unique tags across all notes
  getAllTags(): string[] {
    const tags = new Set<string>();
    notesStore.notes.forEach((note) => {
      note.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  },

  // Search notes by query
  searchNotes(query: string, spaceId?: string): Note[] {
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const notes = spaceId
      ? notesComputed.getNotesBySpace(spaceId)
      : notesStore.notes;

    return notes.filter((note) => {
      return (
        note.name.toLowerCase().includes(lowerQuery) ||
        note.markdown?.toLowerCase().includes(lowerQuery) ||
        note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    });
  },

  // Get active note
  get activeNote(): Note | undefined {
    if (!notesStore.activeNoteId) return undefined;
    return notesComputed.getNoteById(notesStore.activeNoteId);
  },

  // Get linked tasks for a note
  getLinkedTasks(noteId: string): string[] {
    const note = notesComputed.getNoteById(noteId);
    return note?.linkedTaskIds || [];
  },
};

// Actions
export const notesActions = {
  // Note CRUD
  createNote(spaceId: string, name: string, parentId?: string): Note {
    // Generate path based on parent
    let path: string;
    if (parentId) {
      const parent = notesStore.folders.find((f) => f.id === parentId);
      path = parent ? `${parent.path}/${name}` : `/${name}`;
    } else {
      path = `/${name}`;
    }

    const note: Note = {
      id: crypto.randomUUID(),
      spaceId,
      path,
      name,
      parentId,
      content: null,
      createdAt: new Date(),
      modifiedAt: new Date(),
      accessedAt: new Date(),
      tags: [],
      linkedNoteIds: [],
      linkedTaskIds: [],
      linkedTabIds: [],
      isPinned: false,
      isTemplate: false,
    };

    notesStore.notes.push(note);
    notesStore.activeNoteId = note.id;
    return note;
  },

  updateNote(id: string, content: SerializedEditorState) {
    const note = notesStore.notes.find((n) => n.id === id);
    if (note) {
      note.content = content;
      note.modifiedAt = new Date();
      note.accessedAt = new Date();

      // TODO: Extract markdown for search when we implement markdown conversion
      // note.markdown = extractMarkdown(content);
    }
  },

  renameNote(id: string, newName: string) {
    const note = notesStore.notes.find((n) => n.id === id);
    if (note) {
      const oldPath = note.path;
      note.name = newName;
      note.path = oldPath.replace(/[^/]+$/, newName);
      note.modifiedAt = new Date();
    }
  },

  moveNote(id: string, newParentId?: string) {
    const note = notesStore.notes.find((n) => n.id === id);
    if (!note) return;

    note.parentId = newParentId;

    // Update path
    if (newParentId) {
      const parent = notesStore.folders.find((f) => f.id === newParentId);
      if (parent) {
        note.path = `${parent.path}/${note.name}`;
      }
    } else {
      note.path = `/${note.name}`;
    }

    note.modifiedAt = new Date();
  },

  deleteNote(id: string) {
    const index = notesStore.notes.findIndex((n) => n.id === id);
    if (index >= 0) {
      notesStore.notes.splice(index, 1);
      if (notesStore.activeNoteId === id) {
        notesStore.activeNoteId = null;
      }
    }
  },

  setActiveNote(id: string | null) {
    notesStore.activeNoteId = id;
    if (id) {
      const note = notesStore.notes.find((n) => n.id === id);
      if (note) {
        note.accessedAt = new Date();
      }
    }
  },

  // Folder management
  createFolder(spaceId: string, name: string, parentId?: string): Folder {
    let path: string;
    if (parentId) {
      const parent = notesStore.folders.find((f) => f.id === parentId);
      path = parent ? `${parent.path}/${name}` : `/${name}`;
    } else {
      path = `/${name}`;
    }

    const folder: Folder = {
      id: crypto.randomUUID(),
      spaceId,
      path,
      name,
      parentId,
      expanded: false,
      createdAt: new Date(),
    };

    notesStore.folders.push(folder);
    return folder;
  },

  deleteFolder(id: string) {
    const folder = notesStore.folders.find((f) => f.id === id);
    if (!folder) return;

    const folderPath = folder.path;

    // Delete all notes in folder
    notesStore.notes = notesStore.notes.filter((n) => !n.path.startsWith(folderPath));

    // Delete folder and subfolders
    notesStore.folders = notesStore.folders.filter((f) => !f.path.startsWith(folderPath));
  },

  toggleFolder(id: string) {
    const folder = notesStore.folders.find((f) => f.id === id);
    if (folder) {
      folder.expanded = !folder.expanded;
    }
  },

  renameFolder(id: string, newName: string) {
    const folder = notesStore.folders.find((f) => f.id === id);
    if (!folder) return;

    const oldPath = folder.path;
    const newPath = oldPath.replace(/[^/]+$/, newName);

    folder.name = newName;
    folder.path = newPath;

    // Update paths of all children
    notesStore.folders.forEach((f) => {
      if (f.path.startsWith(oldPath + '/')) {
        f.path = f.path.replace(oldPath, newPath);
      }
    });

    notesStore.notes.forEach((n) => {
      if (n.path.startsWith(oldPath + '/')) {
        n.path = n.path.replace(oldPath, newPath);
      }
    });
  },

  // Tags
  addTag(noteId: string, tag: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note && !note.tags.includes(tag)) {
      note.tags.push(tag);
      note.modifiedAt = new Date();
    }
  },

  removeTag(noteId: string, tag: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note) {
      note.tags = note.tags.filter((t) => t !== tag);
      note.modifiedAt = new Date();
    }
  },

  // Linking
  linkToTask(noteId: string, taskId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note && !note.linkedTaskIds.includes(taskId)) {
      note.linkedTaskIds.push(taskId);
      note.modifiedAt = new Date();
    }
  },

  unlinkFromTask(noteId: string, taskId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note) {
      note.linkedTaskIds = note.linkedTaskIds.filter((id) => id !== taskId);
      note.modifiedAt = new Date();
    }
  },

  linkToTab(noteId: string, tabId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note && !note.linkedTabIds.includes(tabId)) {
      note.linkedTabIds.push(tabId);
      note.modifiedAt = new Date();
    }
  },

  unlinkFromTab(noteId: string, tabId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note) {
      note.linkedTabIds = note.linkedTabIds.filter((id) => id !== tabId);
      note.modifiedAt = new Date();
    }
  },

  linkToNote(noteId: string, linkedNoteId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note && !note.linkedNoteIds.includes(linkedNoteId)) {
      note.linkedNoteIds.push(linkedNoteId);
      note.modifiedAt = new Date();
    }
  },

  unlinkFromNote(noteId: string, linkedNoteId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note) {
      note.linkedNoteIds = note.linkedNoteIds.filter((id) => id !== linkedNoteId);
      note.modifiedAt = new Date();
    }
  },

  // Pin/unpin
  togglePin(noteId: string) {
    const note = notesStore.notes.find((n) => n.id === noteId);
    if (note) {
      note.isPinned = !note.isPinned;
    }
  },
};
