/**
 * Tauri Platform Bridge Implementation
 *
 * This implementation uses Tauri's IPC system to communicate with the Rust backend.
 */

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen as tauriListen } from '@tauri-apps/api/event';
import { spawn } from 'tauri-pty';

import type { IPlatformBridge } from './interface';
import type {
  BrowserViewOptions,
  Terminal,
  TerminalOptions,
  UnlistenFn,
} from './types';

export class TauriBridge implements IPlatformBridge {
  // ============================================================================
  // IPC: Core Communication
  // ============================================================================

  async invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T> {
    return tauriInvoke<T>(command, args);
  }

  async listen<T = unknown>(
    event: string,
    handler: (payload: T) => void
  ): Promise<UnlistenFn> {
    const unlisten = await tauriListen<T>(event, (event) => {
      handler(event.payload);
    });
    return unlisten;
  }

  // ============================================================================
  // Browser: Webview Management
  // ============================================================================

  async createBrowserView(options: BrowserViewOptions): Promise<string> {
    // Note: Window parameter is automatically injected by Tauri, don't pass it in args
    return tauriInvoke<string>('create_browser_webview', {
      label: options.label,
      url: options.url,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    });
  }

  async closeBrowserView(label: string): Promise<void> {
    await tauriInvoke('close_browser_webview', { label });
  }

  async updateBrowserBounds(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    // Note: Window parameter is automatically injected by Tauri
    await tauriInvoke('update_webview_bounds', {
      label,
      x,
      y,
      width,
      height,
    });
  }

  async navigateBrowser(label: string, url: string): Promise<void> {
    // Note: Window parameter is automatically injected by Tauri
    await tauriInvoke('navigate_webview', {
      label,
      url,
    });
  }

  async browserGoBack(label: string): Promise<string> {
    return tauriInvoke<string>('webview_go_back', { label });
  }

  async browserGoForward(label: string): Promise<string> {
    return tauriInvoke<string>('webview_go_forward', { label });
  }

  async browserCanGoBack(label: string): Promise<boolean> {
    return tauriInvoke<boolean>('webview_can_go_back', { label });
  }

  async browserCanGoForward(label: string): Promise<boolean> {
    return tauriInvoke<boolean>('webview_can_go_forward', { label });
  }

  async showModalOverlay(): Promise<void> {
    // Not needed for Tauri - CSS z-index works fine with child webviews
  }

  async hideModalOverlay(): Promise<void> {
    // Not needed for Tauri - CSS z-index works fine with child webviews
  }

  // ============================================================================
  // Terminal: PTY Management
  // ============================================================================

  async spawnTerminal(shell: string, args: string[], options: TerminalOptions): Promise<Terminal> {
    const pty = spawn(shell, args, {
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: options.env,
    });

    return {
      onData: (handler: (data: string) => void) => {
        pty.onData(handler);
      },
      write: (data: string) => {
        pty.write(data);
      },
      resize: (cols: number, rows: number) => {
        pty.resize(cols, rows);
      },
      onExit: (handler: (exitCode: { exitCode: number }) => void) => {
        pty.onExit(handler);
      },
      kill: () => {
        // tauri-pty doesn't expose kill method directly
        // The PTY will be cleaned up when the terminal component unmounts
      },
    };
  }

  // ============================================================================
  // Platform Info
  // ============================================================================

  getPlatformName(): string {
    return 'tauri';
  }
}
