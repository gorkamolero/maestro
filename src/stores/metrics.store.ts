import { proxy } from 'valtio';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface SystemMetrics {
  total_ram: number; // in MB
  used_ram: number; // in MB
  total_cpu: number; // percentage
  process_count: number;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  ram: number; // in MB
  cpu: number; // percentage
}

export interface SegmentResourceMetrics {
  segment_id: string;
  ram: number; // in MB
  cpu: number; // percentage
  processes: ProcessMetrics[];
  last_updated: string;
}

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

    // Listen to system metrics events from Rust
    await listen<SystemMetrics>('system-metrics', (event) => {
      metricsStore.systemMetrics = event.payload;
    });

    // Initial fetch
    await metricsActions.fetchSystemMetrics();
  },

  async stopMonitoring() {
    metricsStore.isMonitoring = false;
  },

  async fetchSystemMetrics() {
    try {
      const metrics = await invoke<SystemMetrics>('get_system_metrics');
      metricsStore.systemMetrics = metrics;
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
    }
  },

  async fetchProcessMetrics(pid: number): Promise<ProcessMetrics | null> {
    try {
      const metrics = await invoke<ProcessMetrics | null>('get_process_metrics', { pid });
      return metrics;
    } catch (error) {
      console.error('Failed to fetch process metrics:', error);
      return null;
    }
  },

  async trackSegmentProcess(segmentId: string, pid: number) {
    try {
      await invoke('track_segment_process', { segmentId, pid });
    } catch (error) {
      console.error('Failed to track segment process:', error);
    }
  },

  async untrackSegment(segmentId: string) {
    try {
      await invoke('untrack_segment', { segmentId });
      metricsStore.segmentMetrics.delete(segmentId);
    } catch (error) {
      console.error('Failed to untrack segment:', error);
    }
  },

  async fetchSegmentMetrics(segmentId: string) {
    try {
      const metrics = await invoke<SegmentResourceMetrics | null>('get_segment_metrics', {
        segmentId,
      });
      if (metrics) {
        metricsStore.segmentMetrics.set(segmentId, metrics);
      }
    } catch (error) {
      console.error('Failed to fetch segment metrics:', error);
    }
  },

  async killProcess(pid: number) {
    try {
      await invoke('kill_process', { pid });
    } catch (error) {
      console.error('Failed to kill process:', error);
      throw error;
    }
  },

  async fetchAllProcesses() {
    try {
      const processes = await invoke<ProcessMetrics[]>('get_all_processes');
      metricsStore.allProcesses = processes;
    } catch (error) {
      console.error('Failed to fetch all processes:', error);
    }
  },

  getSegmentMetrics(segmentId: string): SegmentResourceMetrics | undefined {
    return metricsStore.segmentMetrics.get(segmentId);
  },
};
