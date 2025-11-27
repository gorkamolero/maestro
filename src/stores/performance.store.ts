import { proxy, useSnapshot } from 'valtio';

// ============================================================================
// Types
// ============================================================================

export interface AppMetrics {
  label: string; // browser-{tabId}
  tabId: string;
  memoryKB: number; // Working set size in KB
  cpuPercent: number; // CPU usage percentage
  pid?: number; // Process ID
  createdAt: number; // Timestamp
}

export interface TabMetrics {
  tabId: string;
  spaceId: string;
  type: string;
  memoryKB: number; // Total memory for this tab
  cpuPercent: number; // CPU usage
  isActive: boolean;
}

export interface SpaceMetrics {
  spaceId: string;
  totalMemoryKB: number;
  avgCpuPercent: number;
  tabCount: number;
  activeAppCount: number;
}

export interface SystemMetrics {
  cpuPercent: number; // Overall app CPU usage
  memoryMB: number; // Overall app memory in MB
  memoryPercent: number; // Percentage of system memory
  viewCount: number; // Number of active BrowserViews
  isConnected: boolean; // IPC connection status
}

interface PerformanceState {
  // Per-app metrics (keyed by BrowserView label)
  apps: Record<string, AppMetrics>;

  // Per-tab aggregated metrics
  tabs: Record<string, TabMetrics>;

  // Per-space aggregated metrics
  spaces: Record<string, SpaceMetrics>;

  // System-wide metrics
  system: SystemMetrics;

  // Last update timestamp
  lastUpdated: number;

  // Collection interval in ms
  collectionInterval: number;
}

// ============================================================================
// Store
// ============================================================================

const initialState: PerformanceState = {
  apps: {},
  tabs: {},
  spaces: {},
  system: {
    cpuPercent: 0,
    memoryMB: 0,
    memoryPercent: 0,
    viewCount: 0,
    isConnected: false,
  },
  lastUpdated: 0,
  collectionInterval: 2000,
};

// Simple proxy store (no persistence needed - metrics are transient)
export const performanceStore = proxy<PerformanceState>(initialState);

// ============================================================================
// Hook
// ============================================================================

export function usePerformanceStore() {
  return useSnapshot(performanceStore);
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get metrics for a specific tab
 */
export function getTabMetrics(tabId: string): TabMetrics | undefined {
  return performanceStore.tabs[tabId];
}

/**
 * Get metrics for a specific space
 */
export function getSpaceMetrics(spaceId: string): SpaceMetrics | undefined {
  return performanceStore.spaces[spaceId];
}

/**
 * Get metrics for active space
 */
export function getActiveSpaceMetrics(activeSpaceId: string | null): SpaceMetrics | null {
  if (!activeSpaceId) return null;
  return performanceStore.spaces[activeSpaceId] || null;
}

/**
 * Get all app metrics for tabs in a space
 */
export function getAppsForSpace(spaceId: string): AppMetrics[] {
  return Object.values(performanceStore.apps).filter((app) => {
    const tabMetrics = performanceStore.tabs[app.tabId];
    return tabMetrics?.spaceId === spaceId;
  });
}

// ============================================================================
// Actions
// ============================================================================

export const performanceActions = {
  /**
   * Update metrics from main process
   */
  updateMetrics(data: {
    apps: Record<string, AppMetrics>;
    system: SystemMetrics;
    timestamp: number;
  }) {
    // Update app metrics
    performanceStore.apps = data.apps;
    performanceStore.system = data.system;
    performanceStore.lastUpdated = data.timestamp;
  },

  /**
   * Update tab metrics mapping (called when tabs change)
   */
  updateTabMetrics(
    tabs: Array<{ id: string; spaceId: string; type: string }>,
    activeTabId: string | null
  ) {
    const newTabMetrics: Record<string, TabMetrics> = {};

    for (const tab of tabs) {
      const appLabel = `browser-${tab.id}`;
      const appMetrics = performanceStore.apps[appLabel];

      newTabMetrics[tab.id] = {
        tabId: tab.id,
        spaceId: tab.spaceId,
        type: tab.type,
        memoryKB: appMetrics?.memoryKB || 0,
        cpuPercent: appMetrics?.cpuPercent || 0,
        isActive: tab.id === activeTabId,
      };
    }

    performanceStore.tabs = newTabMetrics;
  },

  /**
   * Recalculate space metrics from tab metrics
   */
  updateSpaceMetrics(spaceIds: string[]) {
    const newSpaceMetrics: Record<string, SpaceMetrics> = {};

    for (const spaceId of spaceIds) {
      const spaceTabs = Object.values(performanceStore.tabs).filter((t) => t.spaceId === spaceId);

      const totalMemoryKB = spaceTabs.reduce((sum, t) => sum + t.memoryKB, 0);
      const avgCpuPercent =
        spaceTabs.length > 0
          ? spaceTabs.reduce((sum, t) => sum + t.cpuPercent, 0) / spaceTabs.length
          : 0;
      const activeAppCount = spaceTabs.filter((t) => t.memoryKB > 0).length;

      newSpaceMetrics[spaceId] = {
        spaceId,
        totalMemoryKB,
        avgCpuPercent,
        tabCount: spaceTabs.length,
        activeAppCount,
      };
    }

    performanceStore.spaces = newSpaceMetrics;
  },

  /**
   * Mark connection status
   */
  setConnected(connected: boolean) {
    performanceStore.system.isConnected = connected;
  },

  /**
   * Clear all metrics (e.g., on app reset)
   */
  clear() {
    performanceStore.apps = {};
    performanceStore.tabs = {};
    performanceStore.spaces = {};
    performanceStore.system = initialState.system;
    performanceStore.lastUpdated = 0;
  },
};

// ============================================================================
// Formatters
// ============================================================================

/**
 * Format memory for display
 */
export function formatMemory(kb: number): string {
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  } else if (kb < 1024 * 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  } else {
    return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Format CPU percentage
 */
export function formatCpu(percent: number): string {
  return `${percent.toFixed(1)}%`;
}
