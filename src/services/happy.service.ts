/**
 * Happy Coder Service
 *
 * Manages Happy Coder CLI detection, installation status, and session tracking.
 * Happy Coder provides E2E encrypted mobile access to Claude Code sessions.
 *
 * @see https://github.com/23c/happy-cli
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface HappyDetectionResult {
  isInstalled: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface HappySessionInfo {
  sessionId: string;
  startedAt: string;
  trackName?: string;
  trackIcon?: string;
}

/**
 * Service for managing Happy Coder CLI integration
 */
export class HappyService {
  private activeSessions = new Map<string, HappySessionInfo>();
  private detectionCache: HappyDetectionResult | null = null;
  private lastDetection = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Detect if happy-coder CLI is installed
   */
  async detectInstallation(): Promise<HappyDetectionResult> {
    // Return cached result if fresh
    const now = Date.now();
    if (this.detectionCache && now - this.lastDetection < this.CACHE_TTL) {
      return this.detectionCache;
    }

    try {
      // Try to get version
      const { stdout } = await execAsync('happy --version');
      const version = stdout.trim();

      // Get path
      let path: string | undefined;
      try {
        const { stdout: whichOut } = await execAsync('which happy');
        path = whichOut.trim();
      } catch {
        // which failed, but happy exists
      }

      this.detectionCache = {
        isInstalled: true,
        version,
        path,
      };
    } catch (error) {
      this.detectionCache = {
        isInstalled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    this.lastDetection = now;
    return this.detectionCache;
  }

  /**
   * Check if happy-coder is installed (quick cache check)
   */
  async isInstalled(): Promise<boolean> {
    const result = await this.detectInstallation();
    return result.isInstalled;
  }

  /**
   * Clear detection cache (call when user might have installed)
   */
  clearCache(): void {
    this.detectionCache = null;
    this.lastDetection = 0;
  }

  /**
   * Register an active Happy session
   */
  registerSession(sessionId: string, info: Omit<HappySessionInfo, 'sessionId'>): void {
    this.activeSessions.set(sessionId, {
      sessionId,
      ...info,
    });
  }

  /**
   * Unregister a Happy session
   */
  unregisterSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): HappySessionInfo[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Check if a specific session is using Happy
   */
  isHappySession(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  /**
   * Get the command to use (happy or claude)
   */
  async getCommand(preferHappy: boolean): Promise<'happy' | 'claude'> {
    if (!preferHappy) {
      return 'claude';
    }

    const isInstalled = await this.isInstalled();
    return isInstalled ? 'happy' : 'claude';
  }

  /**
   * Build environment variables for Happy session
   */
  buildHappyEnv(options?: {
    serverUrl?: string;
    webappUrl?: string;
    trackName?: string;
    trackIcon?: string;
  }): Record<string, string> {
    const env: Record<string, string> = {};

    // Custom relay server
    if (options?.serverUrl) {
      env.HAPPY_SERVER_URL = options.serverUrl;
    }

    // Custom web app URL
    if (options?.webappUrl) {
      env.HAPPY_WEBAPP_URL = options.webappUrl;
    }

    // Track metadata (for Maestro-aware mobile display)
    // These are custom env vars that a forked happy-cli could use
    if (options?.trackName) {
      env.MAESTRO_TRACK_NAME = options.trackName;
    }

    if (options?.trackIcon) {
      env.MAESTRO_TRACK_ICON = options.trackIcon;
    }

    return env;
  }

  /**
   * Get QR code URL for pairing
   * Note: This returns the web app URL for manual pairing.
   * The actual QR code content comes from Happy CLI output.
   */
  getWebAppUrl(customUrl?: string): string {
    return customUrl || 'https://app.happy.engineering';
  }

  /**
   * Get installation instructions
   */
  getInstallInstructions(): string {
    return 'npm install -g happy-coder';
  }
}

// Singleton instance
export const happyService = new HappyService();
