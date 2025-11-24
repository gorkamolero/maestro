/**
 * Combines valtio-history (undo/redo) with IndexedDB persistence.
 *
 * The problem: proxyWithHistory and persist both create proxies, and using them
 * together naively disconnects the history tracking from persistence.
 *
 * The solution: Use proxyWithHistory as the source of truth, then subscribe to
 * its .value changes and persist them manually using IndexedDB.
 */

import { subscribe, snapshot } from 'valtio';
import { proxyWithHistory, type HistoryOptions } from 'valtio-history';
import { IndexedDBStrategy } from 'valtio-persist/indexed-db';

interface PersistWithHistoryOptions<T> {
  /** Time in ms to debounce persistence (default: 1000) */
  debounceTime?: number;
  /** Fields to omit from persistence */
  omit?: (keyof T)[];
  /** History options from valtio-history */
  historyOptions?: Partial<HistoryOptions<T>>;
}

// Debounced history saves - coalesce rapid mutations into single history entry
const pendingHistorySaves = new Map<object, ReturnType<typeof setTimeout>>();
const HISTORY_SAVE_DELAY = 100; // ms to wait before saving history

/**
 * Schedule a debounced history save for a proxy
 */
function scheduleHistorySave(historyProxy: { saveHistory: () => void }): void {
  // Clear any pending save for this proxy
  const existing = pendingHistorySaves.get(historyProxy);
  if (existing) {
    clearTimeout(existing);
  }

  // Schedule new save
  const timeoutId = setTimeout(() => {
    pendingHistorySaves.delete(historyProxy);
    historyProxy.saveHistory();
  }, HISTORY_SAVE_DELAY);

  pendingHistorySaves.set(historyProxy, timeoutId);
}

interface PersistWithHistoryResult<T extends object> {
  /** The history proxy - use .value to access state, call .undo()/.redo() for history */
  history: ReturnType<typeof proxyWithHistory<T>>;
  /** Direct reference to history.value for convenience */
  store: T;
  /** Manually trigger persistence */
  persist: () => Promise<void>;
  /** Clear persisted state */
  clear: () => Promise<void>;
  /** Restore state from storage */
  restore: () => Promise<boolean>;
}

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

function deepMerge<T extends object>(initial: T, stored: Partial<T>): T {
  const result = { ...initial };

  for (const key of Object.keys(stored) as (keyof T)[]) {
    const storedValue = stored[key];
    const initialValue = initial[key];

    if (
      storedValue !== undefined &&
      storedValue !== null &&
      typeof storedValue === 'object' &&
      !Array.isArray(storedValue) &&
      initialValue !== undefined &&
      initialValue !== null &&
      typeof initialValue === 'object' &&
      !Array.isArray(initialValue)
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(initialValue as object, storedValue as object) as T[keyof T];
    } else if (storedValue !== undefined) {
      // Use stored value for primitives and arrays
      result[key] = storedValue as T[keyof T];
    }
  }

  return result;
}

function filterOmittedKeys<T extends object>(state: T, omit?: (keyof T)[]): Partial<T> {
  if (!omit || omit.length === 0) return state;

  const filtered = { ...state };
  for (const key of omit) {
    delete filtered[key];
  }
  return filtered;
}

/**
 * Check if a value is a Date-like object (real Date or frozen valtio snapshot Date)
 */
function isDateObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  // Check internal [[Class]] which works even on frozen objects
  return Object.prototype.toString.call(value) === '[object Date]';
}

/**
 * Safely extract timestamp from a Date-like value.
 * Works with both real Dates and frozen valtio snapshot Dates.
 */
function safeGetTimestamp(value: unknown): number | null {
  if (!isDateObject(value)) return null;

  // For frozen Date objects, String(value) still works and returns the date string
  try {
    const dateStr = String(value);
    if (dateStr && dateStr !== 'Invalid Date' && dateStr !== '[object Object]') {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch {
    // String conversion failed
  }

  return null;
}

/**
 * Deep clone an object, converting Date-like objects to serializable format.
 * This handles valtio snapshots where Date objects lose their prototype.
 */
function prepareForSerialization(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Handle primitives first
  if (typeof value !== 'object') return value;

  // Check for Date objects FIRST (before array check, since Date is an object)
  if (isDateObject(value)) {
    const timestamp = safeGetTimestamp(value);
    if (timestamp !== null) {
      return { __type: 'Date', value: timestamp };
    }
    // Couldn't extract timestamp, return null to avoid JSON.stringify errors
    return null;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => prepareForSerialization(item));
  }

  // Handle regular objects - recurse into properties
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    result[k] = prepareForSerialization(v);
  }
  return result;
}

/**
 * Custom JSON reviver that restores Date objects.
 */
function jsonReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '__type' in value) {
    const typed = value as { __type: string; value: unknown };
    if (typed.__type === 'Date' && typeof typed.value === 'number') {
      return new Date(typed.value);
    }
  }
  return value;
}

/**
 * Creates a valtio proxy with both history (undo/redo) and IndexedDB persistence.
 *
 * @example
 * ```typescript
 * const { history, store } = await persistWithHistory(
 *   { count: 0, name: 'initial' },
 *   'my-store-key',
 *   { debounceTime: 1000, omit: ['tempField'] }
 * );
 *
 * // Mutate state - changes are tracked in history and persisted
 * store.count++;
 *
 * // Undo/Redo
 * history.undo();
 * history.redo();
 *
 * // Check if undo/redo is possible
 * if (history.canUndo()) history.undo();
 * ```
 */
export async function persistWithHistory<T extends object>(
  initialState: T,
  key: string,
  options: PersistWithHistoryOptions<T> = {}
): Promise<PersistWithHistoryResult<T>> {
  const { debounceTime = 1000, omit, historyOptions } = options;

  // Initialize IndexedDB storage
  const storage = new IndexedDBStrategy('maestro-persist', 'states');

  // Load existing state from storage
  let mergedState = initialState;
  try {
    const storedData = await storage.get(key);
    if (storedData) {
      const parsedData = JSON.parse(storedData, jsonReviver) as Partial<T>;
      // Merge stored state with initial state (handles new fields added to schema)
      mergedState = deepMerge(initialState, parsedData);
    }
  } catch (error) {
    console.warn(`[persistWithHistory] Failed to load state for key "${key}":`, error);
  }

  // Create history proxy with merged state
  // Use skipSubscribe: true so we can control when history is saved (for batching)
  const historyProxy = proxyWithHistory<T>(mergedState, {
    ...historyOptions,
    skipSubscribe: true,
  });

  // Set up manual subscription with debounced history saving
  // This coalesces rapid mutations into a single history entry
  subscribe(historyProxy, (ops) => {
    // Only save history for changes to .value (not .history metadata)
    const shouldSave = historyProxy.shouldSaveHistory(ops);
    if (shouldSave) {
      scheduleHistorySave(historyProxy);
    }
  });

  // Create persistence function
  const persistData = async () => {
    try {
      const currentSnapshot = snapshot(historyProxy.value);
      const dataToStore = filterOmittedKeys(currentSnapshot as T, omit);
      // Pre-process to handle Date objects in frozen snapshots
      const serializable = prepareForSerialization(dataToStore);
      await storage.set(key, JSON.stringify(serializable));
    } catch (error) {
      console.error(`[persistWithHistory] Failed to persist state for key "${key}":`, error);
    }
  };

  // Debounced persistence
  const debouncedPersist = debounce(persistData, debounceTime);

  // Subscribe to the PARENT proxy to catch when value is replaced (on undo/redo)
  subscribe(historyProxy, () => {
    debouncedPersist();
  });

  return {
    /**
     * The history proxy - use with useSnapshot() for reactive state:
     *   const { value } = useSnapshot(history);
     *   // value.tabs, value.activeTabId, etc.
     *
     * For mutations, use history.value directly:
     *   history.value.tabs.push(newTab);
     *
     * For undo/redo:
     *   history.undo();
     *   history.redo();
     */
    history: historyProxy,
    persist: persistData,
    clear: async () => {
      await storage.remove(key);
    },
    restore: async () => {
      try {
        const storedData = await storage.get(key);
        if (storedData) {
          const parsedData = JSON.parse(storedData, jsonReviver) as Partial<T>;
          // Update the history proxy's value (this will add to history)
          Object.assign(historyProxy.value, deepMerge(initialState, parsedData));
          return true;
        }
      } catch (error) {
        console.error(`[persistWithHistory] Failed to restore state for key "${key}":`, error);
      }
      return false;
    },
  };
}
