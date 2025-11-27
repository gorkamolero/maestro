import { useEffect, useCallback, useRef } from 'react';
import { platform } from '@/lib/platform';
import type { PerformanceData } from '@/lib/platform/interface';
import {
  performanceActions,
  usePerformanceStore,
  formatMemory,
  formatCpu,
  type SpaceMetrics,
} from '@/stores/performance.store';
import { getWorkspaceStore, useWorkspaceStore } from '@/stores/workspace.store';
import { getSpacesStore, useSpacesStore } from '@/stores/spaces.store';

/**
 * Hook to initialize and manage performance monitoring.
 * Call this once at the app root level.
 */
export function usePerformanceMonitor(intervalMs = 2000) {
  const unlistenRef = useRef<(() => void) | null>(null);
  const { tabs, activeTabId } = useWorkspaceStore();
  const { spaces } = useSpacesStore();

  // Start collection and listen for updates
  useEffect(() => {
    let mounted = true;

    const startMonitoring = async () => {
      try {
        // Start collection in main process
        await platform.startPerformanceCollection(intervalMs);
        performanceActions.setConnected(true);

        // Listen for metrics updates
        const unlisten = await platform.listen<PerformanceData>(
          'performance-metrics',
          (data) => {
            if (!mounted) return;

            // Update the store with new metrics
            performanceActions.updateMetrics({
              apps: data.apps,
              system: data.system,
              timestamp: data.timestamp,
            });

            // Also update tab and space aggregations when new metrics arrive
            const workspaceStore = getWorkspaceStore();
            const spacesStore = getSpacesStore();

            const tabsForMetrics = workspaceStore.tabs.map(t => ({
              id: t.id,
              spaceId: t.spaceId,
              type: t.type,
            }));

            performanceActions.updateTabMetrics(tabsForMetrics, workspaceStore.activeTabId);

            const spaceIds = [...new Set(spacesStore.spaces.map(s => s.id))];
            performanceActions.updateSpaceMetrics(spaceIds);
          }
        );

        unlistenRef.current = unlisten;
      } catch (error) {
        console.error('[Performance] Failed to start monitoring:', error);
        performanceActions.setConnected(false);
      }
    };

    startMonitoring();

    return () => {
      mounted = false;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      platform.stopPerformanceCollection().catch(console.error);
      performanceActions.setConnected(false);
    };
  }, [intervalMs]);

  // Update tab and space metrics when tabs change
  useEffect(() => {
    // Map tabs to metrics structure
    const tabsForMetrics = tabs.map(t => ({
      id: t.id,
      spaceId: t.spaceId,
      type: t.type,
    }));

    performanceActions.updateTabMetrics(tabsForMetrics, activeTabId);

    // Get unique space IDs
    const spaceIds = [...new Set(spaces.map(s => s.id))];
    performanceActions.updateSpaceMetrics(spaceIds);
  }, [tabs, activeTabId, spaces]);
}

/**
 * Hook to get performance data for the active space.
 * Used by StatusBar and other components.
 */
export function useActiveSpacePerformance() {
  const { activeSpaceId } = useWorkspaceStore();
  const performance = usePerformanceStore();

  const spaceMetrics = activeSpaceId ? performance.spaces[activeSpaceId] : null;

  return {
    spaceId: activeSpaceId,
    spaceMetrics,
    systemMetrics: performance.system,
    lastUpdated: performance.lastUpdated,
    isConnected: performance.system.isConnected,
  };
}

/**
 * Hook to get performance data for a specific tab.
 */
export function useTabPerformance(tabId: string | null) {
  const performance = usePerformanceStore();

  if (!tabId) {
    return null;
  }

  const tabMetrics = performance.tabs[tabId];
  const appLabel = `browser-${tabId}`;
  const appMetrics = performance.apps[appLabel];

  return {
    tabMetrics,
    appMetrics,
  };
}

/**
 * Hook to get performance data for all tabs in a space.
 */
export function useSpaceTabsPerformance(spaceId: string | null) {
  const performance = usePerformanceStore();
  const { tabs } = useWorkspaceStore();

  if (!spaceId) {
    return {
      tabs: [],
      totalMemoryKB: 0,
      avgCpuPercent: 0,
    };
  }

  const spaceTabs = tabs.filter(t => t.spaceId === spaceId);
  const tabsWithMetrics = spaceTabs.map(tab => ({
    tab,
    metrics: performance.tabs[tab.id],
    appMetrics: performance.apps[`browser-${tab.id}`],
  }));

  const totalMemoryKB = tabsWithMetrics.reduce(
    (sum, t) => sum + (t.metrics?.memoryKB || 0),
    0
  );

  const activeTabs = tabsWithMetrics.filter(t => t.metrics?.memoryKB);
  const avgCpuPercent = activeTabs.length > 0
    ? activeTabs.reduce((sum, t) => sum + (t.metrics?.cpuPercent || 0), 0) / activeTabs.length
    : 0;

  return {
    tabs: tabsWithMetrics,
    totalMemoryKB,
    avgCpuPercent,
  };
}

/**
 * Hook to format performance values for display.
 */
export function usePerformanceFormatters() {
  const formatSpaceMemory = useCallback((metrics: SpaceMetrics | null) => {
    if (!metrics) return '0 KB';
    return formatMemory(metrics.totalMemoryKB);
  }, []);

  const formatSpaceCpu = useCallback((metrics: SpaceMetrics | null) => {
    if (!metrics) return '0%';
    return formatCpu(metrics.avgCpuPercent);
  }, []);

  return {
    formatMemory,
    formatCpu,
    formatSpaceMemory,
    formatSpaceCpu,
  };
}
