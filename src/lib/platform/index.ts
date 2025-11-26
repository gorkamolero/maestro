/**
 * Platform Abstraction Layer
 *
 * This module provides a unified interface for platform-specific operations.
 *
 * Usage:
 * ```typescript
 * import { platform } from '@/lib/platform';
 *
 * // Use platform methods instead of direct Electron APIs
 * await platform.invoke('get_system_metrics');
 * await platform.listen('system-metrics', (payload) => { ... });
 * ```
 */

import type { IPlatformBridge } from './interface';
import { ElectronBridge } from './electron';

// Export types
export type { IPlatformBridge } from './interface';
export type * from './types';

// ============================================================================
// Singleton Platform Instance
// ============================================================================

/**
 * Global platform bridge instance
 *
 * Use this singleton throughout your application instead of
 * importing Electron APIs directly.
 */
export const platform: IPlatformBridge = new ElectronBridge();

/**
 * Get current platform name
 */
export const PLATFORM = platform.getPlatformName();

/**
 * Platform check utilities
 */
export const isElectron = true;
