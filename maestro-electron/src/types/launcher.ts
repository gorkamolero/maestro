// Types for the launcher system

export interface ConnectedApp {
  id: string;
  bundleId: string;
  name: string;
  path: string;
  icon: string; // Base64 encoded
  capabilities: AppCapabilities;
  createdAt: string;
}

export interface AppCapabilities {
  urlScheme: string | null;
  applescriptable: boolean;
  fileAssociations: string[];
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: string;
  isMinimized: boolean;
  isFullscreen: boolean;
  windowTitle: string;
  windowIndex: number;
}

export interface SavedState {
  windows: WindowState[];
  capturedAt: string;
  capturedFromFile: string | null;
}

export interface LaunchConfig {
  filePath: string | null;
  deepLink: string | null;
  launchMethod: 'file' | 'deeplink' | 'app-only';
}

export interface Favorite {
  id: string;
  workspaceId: string;
  connectedAppId: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  launchConfig: LaunchConfig;
  savedState: SavedState | null;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchResult {
  success: boolean;
  method: 'file' | 'deeplink' | 'app-only';
  warnings: LaunchWarning[];
  error: LaunchError | null;
}

export interface LaunchWarning {
  code: string;
  message: string;
}

export interface LaunchError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface RunningApp {
  bundleId: string;
  name: string;
  pid: number;
}
