/**
 * Platform Bridge Interface
 *
 * This interface defines the contract that both Tauri and Electron
 * implementations must fulfill. By coding against this interface,
 * we can swap platforms without changing component code.
 */

import type {
  BrowserViewOptions,
  Terminal,
  TerminalOptions,
  UnlistenFn,
} from './types';

export interface IPlatformBridge {
  // ============================================================================
  // IPC: Core Communication
  // ============================================================================

  /**
   * Invoke a command on the backend
   * @param command Command name
   * @param args Command arguments
   * @returns Promise resolving to command result
   */
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;

  /**
   * Listen to an event from the backend
   * @param event Event name
   * @param handler Event handler
   * @returns Promise resolving to unlisten function
   */
  listen<T = unknown>(
    event: string,
    handler: (payload: T) => void
  ): Promise<UnlistenFn>;

  // ============================================================================
  // Browser: Webview Management
  // ============================================================================

  /**
   * Create a browser webview
   * @param options Browser view configuration
   * @returns Promise resolving to webview label/id
   */
  createBrowserView(options: BrowserViewOptions): Promise<string>;

  /**
   * Close/destroy a browser webview
   * @param label Webview identifier
   */
  closeBrowserView(label: string): Promise<void>;

  /**
   * Update browser webview position and size
   * @param label Webview identifier
   * @param x X position
   * @param y Y position
   * @param width Width
   * @param height Height
   */
  updateBrowserBounds(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void>;

  /**
   * Navigate browser webview to URL
   * @param label Webview identifier
   * @param url URL to navigate to
   */
  navigateBrowser(label: string, url: string): Promise<void>;

  /**
   * Navigate browser webview back
   * @param label Webview identifier
   * @returns New URL after navigation
   */
  browserGoBack(label: string): Promise<string>;

  /**
   * Navigate browser webview forward
   * @param label Webview identifier
   * @returns New URL after navigation
   */
  browserGoForward(label: string): Promise<string>;

  /**
   * Check if browser can go back
   * @param label Webview identifier
   * @returns True if can go back
   */
  browserCanGoBack(label: string): Promise<boolean>;

  /**
   * Check if browser can go forward
   * @param label Webview identifier
   * @returns True if can go forward
   */
  browserCanGoForward(label: string): Promise<boolean>;

  // ============================================================================
  // Terminal: PTY Management
  // ============================================================================

  /**
   * Spawn a terminal with PTY
   * @param shell Shell command to spawn
   * @param args Shell arguments
   * @param options Terminal options
   * @returns Terminal instance
   */
  spawnTerminal(shell: string, args: string[], options: TerminalOptions): Promise<Terminal>;

  // ============================================================================
  // Platform Info
  // ============================================================================

  /**
   * Get current platform name
   * @returns Platform name ('tauri' | 'electron')
   */
  getPlatformName(): string;
}
