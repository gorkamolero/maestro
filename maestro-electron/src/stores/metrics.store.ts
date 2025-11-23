import { proxy } from 'valtio';
import { platform } from '@/lib/platform';
import type { SystemMetrics, ProcessMetrics, SegmentResourceMetrics } from '@/lib/platform';

// Re-export types for backward compatibility
export type { SystemMetrics, ProcessMetrics, SegmentResourceMetrics };

interface MetricsState {
  systemMetrics: SystemMetrics | null;
  segmentMetrics: Map<string, SegmentResourceMetrics>;
  allProcesses: ProcessMetrics[];
  isMonitoring: boolean;
}

export const metricsStore = proxy<MetricsState>({
  systemMetrics: null,
  segmentMetrics: new Map(),
  allProcesses: [],
  isMonitoring: false,
});

export const metricsActions = {
  async startMonitoring() {
    if (metricsStore.isMonitoring) return;

    metricsStore.isMonitoring = true;

    // Listen to system metrics events from backend
    await platform.listen<SystemMetrics>('system-metrics', (payload) => {
      metricsStore.systemMetrics = payload;
    });

    // Initial fetch
    await metricsActions.fetchSystemMetrics();
  },

  async stopMonitoring() {
    metricsStore.isMonitoring = false;
  },

  async fetchSystemMetrics() {
    try {
      const metrics = await platform.getSystemMetrics();
      metricsStore.systemMetrics = metrics;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  },

  async fetchProcessMetrics(pid: number): Promise<ProcessMetrics | null> {
    try {
      const metrics = await platform.getProcessMetrics(pid);
      return metrics;
    } catch (error) {
      console.error('Failed to fetch process metrics:', error);
      return null;
    }
  },

  async trackSegmentProcess(segmentId: string, pid: number) {
    try {
      await platform.trackSegmentProcess(segmentId, pid);
    } catch (error) {
      console.error('Failed to track segment process:', error);
    }
  },

  async untrackSegment(segmentId: string) {
    try {
      await platform.untrackSegment(segmentId);
      metricsStore.segmentMetrics.delete(segmentId);
    } catch (error) {
      console.error('Failed to untrack segment:', error);
    }
  },

  async fetchSegmentMetrics(segmentId: string) {
    try {
      const metrics = await platform.getSegmentMetrics(segmentId);
      if (metrics) {
        metricsStore.segmentMetrics.set(segmentId, metrics);
      }
    } catch (error) {
      console.error('Failed to fetch segment metrics:', error);
    }
  },

  async killProcess(pid: number) {
    try {
      await platform.killProcess(pid);
    } catch (error) {
      console.error('Failed to kill process:', error);
      throw error;
    }
  },

  async fetchAllProcesses() {
    try {
      const processes = await platform.getAllProcesses();
      metricsStore.allProcesses = processes;
    } catch (error) {
      console.error('Failed to fetch all processes:', error);
    }
  },

  getSegmentMetrics(segmentId: string): SegmentResourceMetrics | undefined {
    return metricsStore.segmentMetrics.get(segmentId);
  },
};
