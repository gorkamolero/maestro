/**
 * Database Backup System
 *
 * Periodically backs up IndexedDB data with version history.
 * Keeps the last 5 backups and allows restoring from any backup.
 */

const BACKUP_DB_NAME = 'maestro-backups';
const BACKUP_STORE_NAME = 'backups';
const MAX_BACKUPS = 5;
const BACKUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export interface Backup {
  id: string;
  timestamp: Date;
  data: Record<string, unknown>;
  version: number;
}

let backupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Open the backup database
 */
async function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BACKUP_DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        const store = db.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get all data from the main persistence database
 */
async function getAllPersistenceData(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('maestro-persist', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('states')) {
        db.close();
        resolve({});
        return;
      }

      const transaction = db.transaction('states', 'readonly');
      const store = transaction.objectStore('states');
      const getAllRequest = store.getAll();
      const getAllKeysRequest = store.getAllKeys();

      const data: Record<string, unknown> = {};

      transaction.oncomplete = () => {
        const keys = getAllKeysRequest.result;
        const values = getAllRequest.result;

        keys.forEach((key, index) => {
          data[String(key)] = values[index];
        });

        db.close();
        resolve(data);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

/**
 * Restore data to the main persistence database
 */
async function restorePersistenceData(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('maestro-persist', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('states')) {
        db.close();
        reject(new Error('States store not found'));
        return;
      }

      const transaction = db.transaction('states', 'readwrite');
      const store = transaction.objectStore('states');

      // Clear existing data and restore from backup
      store.clear();

      Object.entries(data).forEach(([key, value]) => {
        store.put(value, key);
      });

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

/**
 * Create a new backup
 */
export async function createBackup(): Promise<Backup> {
  const db = await openBackupDB();

  try {
    // Get all current data
    const data = await getAllPersistenceData();

    // Get existing backups to determine version
    const existingBackups = await getBackups();
    const version = existingBackups.length > 0
      ? Math.max(...existingBackups.map(b => b.version)) + 1
      : 1;

    const backup: Backup = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      data,
      version,
    };

    // Store the backup
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE_NAME);

      store.add(backup);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    // Clean up old backups (keep only last MAX_BACKUPS)
    await pruneBackups();

    console.log(`[Backup] Created backup v${version} at ${backup.timestamp.toISOString()}`);

    return backup;
  } finally {
    db.close();
  }
}

/**
 * Get all backups, sorted by timestamp (newest first)
 */
export async function getBackups(): Promise<Backup[]> {
  const db = await openBackupDB();

  try {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readonly');
      const store = transaction.objectStore(BACKUP_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const backups = request.result as Backup[];
        // Sort by timestamp, newest first
        backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Ensure dates are Date objects (they may be strings after retrieval)
        backups.forEach(backup => {
          if (typeof backup.timestamp === 'string') {
            backup.timestamp = new Date(backup.timestamp);
          }
        });

        resolve(backups);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Delete old backups, keeping only the most recent MAX_BACKUPS
 */
async function pruneBackups(): Promise<void> {
  const backups = await getBackups();

  if (backups.length <= MAX_BACKUPS) {
    return;
  }

  const backupsToDelete = backups.slice(MAX_BACKUPS);
  const db = await openBackupDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE_NAME);

      backupsToDelete.forEach(backup => {
        store.delete(backup.id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log(`[Backup] Pruned ${backupsToDelete.length} old backups`);
  } finally {
    db.close();
  }
}

/**
 * Restore from a specific backup
 */
export async function restoreBackup(backupId: string): Promise<boolean> {
  const backups = await getBackups();
  const backup = backups.find(b => b.id === backupId);

  if (!backup) {
    console.error(`[Backup] Backup not found: ${backupId}`);
    return false;
  }

  try {
    await restorePersistenceData(backup.data);
    console.log(`[Backup] Restored from backup v${backup.version}`);
    return true;
  } catch (error) {
    console.error('[Backup] Failed to restore:', error);
    return false;
  }
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(backupId: string): Promise<boolean> {
  const db = await openBackupDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(BACKUP_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE_NAME);
      store.delete(backupId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/**
 * Start automatic backup interval
 */
export function startAutoBackup(): void {
  if (backupIntervalId) {
    console.warn('[Backup] Auto backup already running');
    return;
  }

  // Create initial backup on startup
  createBackup().catch(err => console.error('[Backup] Initial backup failed:', err));

  // Schedule periodic backups
  backupIntervalId = setInterval(() => {
    createBackup().catch(err => console.error('[Backup] Scheduled backup failed:', err));
  }, BACKUP_INTERVAL_MS);

  console.log(`[Backup] Auto backup started (every ${BACKUP_INTERVAL_MS / 60000} minutes)`);
}

/**
 * Stop automatic backup interval
 */
export function stopAutoBackup(): void {
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
    console.log('[Backup] Auto backup stopped');
  }
}

/**
 * Format backup timestamp for display
 */
export function formatBackupTimestamp(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return timestamp.toLocaleDateString();
}
