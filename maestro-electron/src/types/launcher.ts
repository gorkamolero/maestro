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

export interface LaunchConfig {
  filePath: string | null;
  deepLink: string | null;
  launchMethod: 'file' | 'deeplink' | 'app-only';
}

export interface RunningApp {
  bundleId: string;
  name: string;
  pid: number;
}
