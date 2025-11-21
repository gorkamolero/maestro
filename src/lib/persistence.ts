import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'maestro-db';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';

interface WorkspaceData {
  id: string;
  timeline: any;
  spaces: any[];
  segments: any[];
  lastSaved: Date;
}

let db: IDBPDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<void> {
  if (db) return;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Save workspace state to IndexedDB
 */
export async function saveWorkspace(data: {
  timeline: any;
  spaces: any[];
  segments: any[];
}): Promise<void> {
  if (!db) await initDB();

  const workspaceData: WorkspaceData = {
    id: 'default', // Single workspace for now
    timeline: data.timeline,
    spaces: data.spaces,
    segments: data.segments,
    lastSaved: new Date(),
  };

  await db!.put(STORE_NAME, workspaceData);
  console.log('[Persistence] Workspace saved', new Date().toLocaleTimeString());
}

/**
 * Load workspace state from IndexedDB
 */
export async function loadWorkspace(): Promise<WorkspaceData | null> {
  if (!db) await initDB();

  const data = await db!.get(STORE_NAME, 'default');

  if (data) {
    console.log('[Persistence] Workspace loaded', data.lastSaved);
  }

  return data || null;
}

/**
 * Clear all saved data (for testing/reset)
 */
export async function clearWorkspace(): Promise<void> {
  if (!db) await initDB();
  await db!.delete(STORE_NAME, 'default');
  console.log('[Persistence] Workspace cleared');
}

/**
 * Export workspace as JSON for backup
 */
export async function exportWorkspace(): Promise<string> {
  const data = await loadWorkspace();
  return JSON.stringify(data, null, 2);
}

/**
 * Import workspace from JSON backup
 */
export async function importWorkspace(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);
  await saveWorkspace({
    timeline: data.timeline,
    spaces: data.spaces,
    segments: data.segments,
  });
}
