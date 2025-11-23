/**
 * Electron Platform Bridge Implementation
 *
 * This implementation will use Electron's IPC system when we migrate from Tauri.
 * For now, this is a placeholder/skeleton.
 */

import type { IPlatformBridge } from './interface';
import type {
  BrowserViewOptions,
  Terminal,
  TerminalOptions,
  SystemMetrics,
  ProcessMetrics,
  SegmentResourceMetrics,
  UnlistenFn,
} from './types';

export class ElectronBridge implements IPlatformBridge {
  // ============================================================================
  // IPC: Core Communication
  // ============================================================================

  async invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
    // @ts-expect-error - window.electron will be added by Electron preload
    return window.electron.invoke(command, args);
  }

  async listen<T = unknown>(
    event: string,
    handler: (payload: T) => void
  ): Promise<UnlistenFn> {
    // @ts-expect-error - window.electron will be added by Electron preload
    const unsubscribe = window.electron.on(event, (_event: unknown, payload: T) => {
      handler(payload);
    });
    return () => unsubscribe();
  }

  // ============================================================================
  // Browser: Webview Management
  // ============================================================================

  async createBrowserView(options: BrowserViewOptions): Promise<string> {
    return this.invoke<string>('create_browser_view', options as unknown as Record<string, unknown>);
  }

  async closeBrowserView(label: string): Promise<void> {
    await this.invoke('close_browser_view', { label });
  }

  async updateBrowserBounds(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    await this.invoke('update_browser_bounds', { label, x, y, width, height });
  }

  async navigateBrowser(label: string, url: string): Promise<void> {
    await this.invoke('navigate_browser', { label, url });
  }

  async browserGoBack(label: string): Promise<string> {
    return this.invoke<string>('browser_go_back', { label });
  }

  async browserGoForward(label: string): Promise<string> {
    return this.invoke<string>('browser_go_forward', { label });
  }

  // ============================================================================
  // Terminal: PTY Management
  // ============================================================================

  spawnTerminal(_shell: string, _args: string[], _options: TerminalOptions): Terminal {
    // This will use node-pty in the Electron main process
    // For now, throw an error to indicate this needs to be implemented
    throw new Error('Terminal not implemented in Electron bridge yet');
  }

  // ============================================================================
  // Resource Monitor: System Metrics
  // ============================================================================

  async getSystemMetrics(): Promise<SystemMetrics> {
    return this.invoke<SystemMetrics>('get_system_metrics');
  }

  async getProcessMetrics(pid: number): Promise<ProcessMetrics | null> {
    return this.invoke<ProcessMetrics | null>('get_process_metrics', { pid });
  }

  async trackSegmentProcess(segmentId: string, pid: number): Promise<void> {
    await this.invoke('track_segment_process', { segmentId, pid });
  }

  async untrackSegment(segmentId: string): Promise<void> {
    await this.invoke('untrack_segment', { segmentId });
  }

  async getSegmentMetrics(segmentId: string): Promise<SegmentResourceMetrics | null> {
    return this.invoke<SegmentResourceMetrics | null>('get_segment_metrics', { segmentId });
  }

  async killProcess(pid: number): Promise<void> {
    await this.invoke('kill_process', { pid });
  }

  async getAllProcesses(): Promise<ProcessMetrics[]> {
    return this.invoke<ProcessMetrics[]>('get_all_processes');
  }

  // ============================================================================
  // Platform Info
  // ============================================================================

  getPlatformName(): string {
    return 'electron';
  }
}
