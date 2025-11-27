import { useSnapshot } from 'valtio';
import { persistWithHistory } from '@/lib/persist-with-history';
import type { Tag } from '@/types';
import { TAG_COLOR_PALETTE } from '@/types';

interface TagsState {
  tags: Tag[];
  /** Currently selected tag IDs for filtering (empty = show all) */
  activeFilters: string[];
}

// Create proxy with both history (undo/redo) and IndexedDB persistence
const { history: tagsHistory } = await persistWithHistory<TagsState>(
  {
    tags: [],
    activeFilters: [],
  },
  'maestro-tags',
  {
    debounceTime: 1000,
    omit: ['activeFilters'], // Don't persist filter state
  }
);

export { tagsHistory };

// Getter that always returns current value
export const getTagsStore = () => tagsHistory.value;

/**
 * Get next color for a new tag (cycles through palette)
 */
export const getNextTagColor = () => {
  const store = getTagsStore();
  const index = store.tags.length % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
};

/**
 * Hook to get reactive tags state
 */
export function useTagsStore() {
  const { value } = useSnapshot(tagsHistory);
  return value;
}

export const tagsActions = {
  /**
   * Create a new tag
   */
  addTag: (name: string, color?: string): Tag => {
    const store = getTagsStore();
    const newTag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: color || getNextTagColor(),
    };
    store.tags.push(newTag);
    return newTag;
  },

  /**
   * Update an existing tag
   */
  updateTag: (tagId: string, updates: Partial<Omit<Tag, 'id'>>) => {
    const store = getTagsStore();
    const index = store.tags.findIndex((t) => t.id === tagId);
    if (index !== -1) {
      store.tags[index] = { ...store.tags[index], ...updates };
    }
  },

  /**
   * Delete a tag
   */
  deleteTag: (tagId: string) => {
    const store = getTagsStore();
    store.tags = store.tags.filter((t) => t.id !== tagId);
  },

  /**
   * Get a tag by ID
   */
  getTag: (tagId: string): Tag | undefined => {
    const store = getTagsStore();
    return store.tags.find((t) => t.id === tagId);
  },

  /**
   * Get tags by IDs
   */
  getTagsByIds: (tagIds: string[]): Tag[] => {
    const store = getTagsStore();
    return store.tags.filter((t) => tagIds.includes(t.id));
  },

  /**
   * Toggle a tag filter (for filtering spaces)
   */
  toggleFilter: (tagId: string) => {
    const store = getTagsStore();
    const index = store.activeFilters.indexOf(tagId);
    if (index === -1) {
      store.activeFilters.push(tagId);
    } else {
      store.activeFilters.splice(index, 1);
    }
  },

  /**
   * Set active filters
   */
  setFilters: (tagIds: string[]) => {
    const store = getTagsStore();
    store.activeFilters = tagIds;
  },

  /**
   * Clear all filters
   */
  clearFilters: () => {
    const store = getTagsStore();
    store.activeFilters = [];
  },

  /**
   * Check if a tag is currently being used as a filter
   */
  isFilterActive: (tagId: string): boolean => {
    const store = getTagsStore();
    return store.activeFilters.includes(tagId);
  },
};
