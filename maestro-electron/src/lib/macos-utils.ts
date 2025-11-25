/**
 * macOS Utilities for App Management
 * Uses npm packages for macOS integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import plist from 'plist';
import open from 'open';
import { openWindows as getWindows } from 'get-windows';
import type {
  ConnectedApp,
  AppCapabilities,
  RunningApp,
  WindowState,
} from '../types/launcher';

const execAsync = promisify(exec);

/**
 * Extract app information from .app bundle
 */
export async function getAppInfo(appPath: string): Promise<ConnectedApp> {
  try {
    // Read Info.plist
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    const plistContent = await fs.readFile(plistPath, 'utf8');
    const info = plist.parse(plistContent) as Record<string, unknown>;

    // Extract basic info
    const bundleId = (info.CFBundleIdentifier as string) || '';
    const name =
      (info.CFBundleDisplayName as string) ||
      (info.CFBundleName as string) ||
      path.basename(appPath, '.app');

    // Extract icon (base64 encoded)
    const icon = await extractAppIcon(appPath, info);

    // Extract capabilities
    const capabilities = extractCapabilities(info);

    return {
      id: crypto.randomUUID(),
      bundleId,
      name,
      path: appPath,
      icon,
      capabilities,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to extract app info from ${appPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract app icon as base64 data URL
 * Icons are cached in userData directory to avoid reconverting every time
 */
async function extractAppIcon(
  appPath: string,
  info: Record<string, unknown>
): Promise<string> {
  try {
    // Get icon file name from Info.plist
    const iconFileName = info.CFBundleIconFile as string | undefined;
    if (!iconFileName) {
      return ''; // No icon specified
    }

    // Construct path to icon file
    const iconName = iconFileName.endsWith('.icns')
      ? iconFileName
      : `${iconFileName}.icns`;
    const iconPath = path.join(appPath, 'Contents', 'Resources', iconName);

    // Create cache directory in userData
    const { app } = require('electron');
    const cacheDir = path.join(app.getPath('userData'), 'app-icons');
    await fs.mkdir(cacheDir, { recursive: true });

    // Use bundle ID or app name as cache key
    const bundleId = (info.CFBundleIdentifier as string) || path.basename(appPath, '.app');
    const cacheKey = bundleId.replace(/[^a-zA-Z0-9]/g, '_');
    const cachedPngPath = path.join(cacheDir, `${cacheKey}.png`);

    // Check if cached PNG exists
    try {
      const cachedData = await fs.readFile(cachedPngPath);
      return `data:image/png;base64,${cachedData.toString('base64')}`;
    } catch {
      // Cache miss, need to convert
    }

    // Convert ICNS to PNG using macOS sips command
    // ICNS cannot be displayed in browsers, so we convert to PNG first
    await execAsync(`sips -s format png "${iconPath}" --out "${cachedPngPath}" --resampleHeightWidth 64 64`);

    // Read converted PNG and return as base64
    const pngData = await fs.readFile(cachedPngPath);
    return `data:image/png;base64,${pngData.toString('base64')}`;
  } catch (error) {
    console.warn(`Could not extract icon for ${appPath}:`, error);
    return ''; // Return empty string if icon extraction fails
  }
}

/**
 * Extract app capabilities from Info.plist
 */
function extractCapabilities(info: Record<string, unknown>): AppCapabilities {
  // Extract URL schemes
  let urlScheme: string | null = null;
  const urlTypes = info.CFBundleURLTypes as Array<Record<string, unknown>> | undefined;
  if (urlTypes && Array.isArray(urlTypes) && urlTypes.length > 0) {
    const schemes = urlTypes[0].CFBundleURLSchemes as string[] | undefined;
    if (schemes && schemes.length > 0) {
      urlScheme = schemes[0];
    }
  }

  // Extract file associations
  const fileAssociations: string[] = [];
  const documentTypes = info.CFBundleDocumentTypes as Array<Record<string, unknown>> | undefined;
  if (documentTypes && Array.isArray(documentTypes)) {
    for (const docType of documentTypes) {
      const extensions = docType.CFBundleTypeExtensions as string[] | undefined;
      if (extensions && Array.isArray(extensions)) {
        fileAssociations.push(...extensions);
      }
    }
  }

  // Check for AppleScript support
  const applescriptable = Boolean(info.NSAppleScriptEnabled);

  return {
    urlScheme,
    applescriptable,
    fileAssociations,
  };
}

/**
 * Launch an application
 */
export async function launchApp(
  appPath: string,
  filePath?: string,
  wait = false
): Promise<void> {
  try {
    if (filePath) {
      // Open file with specific app
      await open(filePath, {
        app: { name: appPath },
        wait,
      });
    } else {
      // Just launch the app
      await open(appPath, { wait });
    }
  } catch (error) {
    throw new Error(
      `Failed to launch app ${appPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Launch app via deep link
 */
export async function launchDeepLink(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    throw new Error(
      `Failed to open deep link ${url}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

let hasLoggedGetWindowsError = false;

/**
 * Get list of running applications
 */
export async function getRunningApps(): Promise<RunningApp[]> {
  try {
    const windows = await getWindows();

    // Group by bundle ID to avoid duplicates
    const appMap = new Map<string, RunningApp>();

    for (const window of windows) {
      if (window.owner?.bundleId && !appMap.has(window.owner.bundleId)) {
        appMap.set(window.owner.bundleId, {
          bundleId: window.owner.bundleId,
          name: window.owner.name,
          pid: window.owner.processId,
        });
      }
    }

    return Array.from(appMap.values());
  } catch (error) {
    // Only log once to avoid spamming console (get-windows doesn't work in dev mode)
    if (!hasLoggedGetWindowsError) {
      console.warn('get-windows not available in dev mode, running app detection disabled');
      hasLoggedGetWindowsError = true;
    }
    return [];
  }
}

/**
 * Check if a specific app is running by bundle ID
 */
export async function isAppRunning(bundleId: string): Promise<boolean> {
  try {
    const runningApps = await getRunningApps();
    return runningApps.some((app) => app.bundleId === bundleId);
  } catch (error) {
    return false;
  }
}

/**
 * Bring app to front
 */
export async function bringAppToFront(bundleId: string): Promise<void> {
  try {
    // Use AppleScript to activate the app
    const script = `tell application id "${bundleId}" to activate`;
    await execAsync(`osascript -e '${script}'`);
  } catch (error) {
    throw new Error(
      `Failed to bring app to front: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Capture window state for a running app
 */
export async function captureWindowState(bundleId: string): Promise<WindowState[]> {
  try {
    const windows = await getWindows();
    const appWindows = windows.filter((w) => w.owner?.bundleId === bundleId);

    return appWindows.map((window, index) => ({
      x: window.bounds.x,
      y: window.bounds.y,
      width: window.bounds.width,
      height: window.bounds.height,
      displayId: '0', // TODO: Detect actual display ID
      isMinimized: false, // TODO: Detect minimized state
      isFullscreen: false, // TODO: Detect fullscreen state
      windowTitle: window.title,
      windowIndex: index,
    }));
  } catch (error) {
    console.error('Failed to capture window state:', error);
    return [];
  }
}

export interface InstalledApp {
  name: string;
  path: string;
  bundleId: string | null;
  icon: string | null;
}

// Cache for installed apps (refreshed on demand)
let installedAppsCache: InstalledApp[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

/**
 * Get list of installed applications from /Applications
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  // Return cached if fresh
  if (installedAppsCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return installedAppsCache;
  }

  const apps: InstalledApp[] = [];
  const appDirs = ['/Applications', '/System/Applications'];

  for (const dir of appDirs) {
    try {
      const entries = await fs.readdir(dir);

      for (const entry of entries) {
        if (!entry.endsWith('.app')) continue;

        const appPath = path.join(dir, entry);
        const name = entry.replace('.app', '');

        try {
          // Try to get bundle ID from Info.plist
          const plistPath = path.join(appPath, 'Contents', 'Info.plist');
          const plistContent = await fs.readFile(plistPath, 'utf8');
          const info = plist.parse(plistContent) as Record<string, unknown>;
          const bundleId = (info.CFBundleIdentifier as string) || null;

          apps.push({
            name,
            path: appPath,
            bundleId,
            icon: null, // Icons loaded on demand
          });
        } catch {
          // If plist fails, still add the app with minimal info
          apps.push({
            name,
            path: appPath,
            bundleId: null,
            icon: null,
          });
        }
      }
    } catch {
      // Directory doesn't exist or not accessible
    }
  }

  // Sort alphabetically
  apps.sort((a, b) => a.name.localeCompare(b.name));

  installedAppsCache = apps;
  cacheTimestamp = Date.now();

  return apps;
}

