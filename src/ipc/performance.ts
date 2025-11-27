import { ipcMain, BrowserWindow, app, BrowserView } from 'electron';

// ============================================================================
// Types
// ============================================================================

interface AppMetrics {
  label: string;
  tabId: string;
  memoryKB: number;
  cpuPercent: number;
  pid?: number;
  createdAt: number;
}

interface SystemMetrics {
  cpuPercent: number;
  memoryMB: number;
  memoryPercent: number;
  viewCount: number;
  isConnected: boolean;
}

interface PerformanceData {
  apps: Record<string, AppMetrics>;
  system: SystemMetrics;
  timestamp: number;
}

// ============================================================================
// State
// ============================================================================

let collectionInterval: NodeJS.Timeout | null = null;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract tabId from browser view label (format: browser-{tabId})
 */
function extractTabId(label: string): string {
  return label.replace(/^browser-/, '');
}

/**
 * Collect metrics from all browser views
 */
async function collectMetrics(
  mainWindow: BrowserWindow | null,
  browserViews: Map<string, { view: BrowserView; label: string }>
): Promise<PerformanceData> {
  const apps: Record<string, AppMetrics> = {};
  const now = Date.now();

  // Get app-wide metrics
  const appMetrics = app.getAppMetrics();
  let totalCpuPercent = 0;
  let totalMemoryKB = 0;

  // Map process IDs to their metrics
  const processMetrics = new Map<number, typeof appMetrics[0]>();
  for (const metric of appMetrics) {
    processMetrics.set(metric.pid, metric);
    totalMemoryKB += metric.memory.workingSetSize;
    totalCpuPercent += metric.cpu.percentCPUUsage;
  }

  // Collect per-view metrics
  for (const [label, info] of browserViews) {
    try {
      const webContents = info.view.webContents;
      if (!webContents || webContents.isDestroyed()) continue;

      const pid = webContents.getOSProcessId();
      const processInfo = processMetrics.get(pid);

      // Get memory info from the webContents process
      let memoryKB = 0;
      let cpuPercent = 0;

      if (processInfo) {
        memoryKB = processInfo.memory.workingSetSize;
        cpuPercent = processInfo.cpu.percentCPUUsage;
      }

      apps[label] = {
        label,
        tabId: extractTabId(label),
        memoryKB,
        cpuPercent,
        pid,
        createdAt: now,
      };
    } catch (error) {
      // View may have been destroyed, skip it
      console.warn(`[Performance] Error collecting metrics for ${label}:`, error);
    }
  }

  const totalMemoryMB = totalMemoryKB / 1024;

  const system: SystemMetrics = {
    cpuPercent: Math.min(100, totalCpuPercent),
    memoryMB: Math.round(totalMemoryMB),
    memoryPercent: 0, // Will be calculated on renderer side if needed
    viewCount: browserViews.size,
    isConnected: true,
  };

  return {
    apps,
    system,
    timestamp: now,
  };
}

// ============================================================================
// IPC Handlers
// ============================================================================

export function registerPerformanceHandlers(
  getMainWindow: () => BrowserWindow | null,
  getBrowserViews: () => Map<string, { view: BrowserView; label: string }>
) {
  /**
   * Start performance metrics collection
   */
  ipcMain.handle('start_performance_collection', async (_event, { intervalMs = 2000 }) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return false;

    // Clear existing interval if any
    if (collectionInterval) {
      clearInterval(collectionInterval);
    }

    // Start collecting and emitting metrics
    collectionInterval = setInterval(async () => {
      const mainWindow = getMainWindow();
      const browserViews = getBrowserViews();

      if (!mainWindow || mainWindow.isDestroyed()) {
        if (collectionInterval) {
          clearInterval(collectionInterval);
          collectionInterval = null;
        }
        return;
      }

      try {
        const metrics = await collectMetrics(mainWindow, browserViews);
        mainWindow.webContents.send('performance-metrics', metrics);
      } catch (error) {
        console.error('[Performance] Collection error:', error);
      }
    }, intervalMs);

    // Collect immediately
    const browserViews = getBrowserViews();
    const metrics = await collectMetrics(mainWindow, browserViews);
    mainWindow.webContents.send('performance-metrics', metrics);

    return true;
  });

  /**
   * Stop performance metrics collection
   */
  ipcMain.handle('stop_performance_collection', async () => {
    if (collectionInterval) {
      clearInterval(collectionInterval);
      collectionInterval = null;
    }
    return true;
  });

  /**
   * Get current metrics snapshot (one-time)
   */
  ipcMain.handle('get_performance_metrics', async () => {
    const mainWindow = getMainWindow();
    const browserViews = getBrowserViews();

    if (!mainWindow) {
      return {
        apps: {},
        system: {
          cpuPercent: 0,
          memoryMB: 0,
          memoryPercent: 0,
          viewCount: 0,
          isConnected: false,
        },
        timestamp: Date.now(),
      };
    }

    return await collectMetrics(mainWindow, browserViews);
  });

  /**
   * Get metrics for a specific browser view
   */
  ipcMain.handle('get_view_metrics', async (_event, { label }) => {
    const browserViews = getBrowserViews();
    const viewInfo = browserViews.get(label);

    if (!viewInfo || viewInfo.view.webContents.isDestroyed()) {
      return null;
    }

    try {
      const webContents = viewInfo.view.webContents;
      const pid = webContents.getOSProcessId();
      const appMetrics = app.getAppMetrics();
      const processInfo = appMetrics.find(m => m.pid === pid);

      return {
        label,
        tabId: extractTabId(label),
        memoryKB: processInfo?.memory.workingSetSize || 0,
        cpuPercent: processInfo?.cpu.percentCPUUsage || 0,
        pid,
        createdAt: Date.now(),
      };
    } catch (error) {
      return null;
    }
  });
}

/**
 * Cleanup on app quit
 */
export function cleanupPerformanceHandlers() {
  if (collectionInterval) {
    clearInterval(collectionInterval);
    collectionInterval = null;
  }
}
