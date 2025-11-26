/**
 * Platform Abstraction Layer
 *
 * This module provides a unified interface for platform-specific operations.
 * It allows seamless switching between Tauri and Electron implementations.
 *
 * Usage:
 * ```typescript
 * import { platform } from '@/lib/platform';
 *
 * // Use platform methods instead of direct Tauri/Electron APIs
 * await platform.invoke('get_system_metrics');
 * await platform.listen('system-metrics', (payload) => { ... });
 * ```
 */

import type { IPlatformBridge } from './interface';
import { TauriBridge } from './tauri';
import { ElectronBridge } from './electron';

// Export types
export type { IPlatformBridge } from './interface';
export type * from './types';

// ============================================================================
// Platform Detection & Selection
// ============================================================================

/**
 * Detect which platform we're running on
 */
function detectPlatform(): 'tauri' | 'electron' {
  // Check if we're in either environment
  if (typeof window !== 'undefined') {
    // Check for Electron first (we're migrating to this)
    // @ts-expect-error - electron will be injected by preload
    if (window.electron) {
      return 'electron';
    }

    // Fallback to Tauri
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    if (window.__TAURI_INTERNALS__) {
      return 'tauri';
    }
  }

  // Default to Electron after migration
  return 'electron';
}

/**
 * Create platform bridge instance based on environment
 */
function createPlatformBridge(): IPlatformBridge {
  const platformType = detectPlatform();

  switch (platformType) {
    case 'tauri':
      return new TauriBridge();
    case 'electron':
      return new ElectronBridge();
    default:
      throw new Error(`Unknown platform: ${platformType}`);
  }
}

// ============================================================================
// Singleton Platform Instance
// ============================================================================

/**
 * Global platform bridge instance
 *
 * Use this singleton throughout your application instead of
 * importing Tauri or Electron APIs directly.
 */
export const platform: IPlatformBridge = createPlatformBridge();

/**
 * Get current platform name
 */
export const PLATFORM = platform.getPlatformName();

/**
 * Platform check utilities
 */
export const isTauri = PLATFORM === 'tauri';
export const isElectron = PLATFORM === 'electron';
