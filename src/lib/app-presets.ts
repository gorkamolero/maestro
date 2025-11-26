import type { ConnectedApp } from '@/types/launcher';

export type ContextType = 'folder' | 'file' | 'deeplink' | 'url' | 'none';

export interface AppPreset {
  contextType: ContextType;
  captureHint?: string;
  fileTypes?: string[];
}

/**
 * Known app presets indexed by bundle ID
 * These define how each app handles "context" - what to remember/restore
 */
export const APP_PRESETS: Record<string, AppPreset> = {
  // Code Editors - folder-based
  'dev.zed.Zed': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.microsoft.VSCode': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.microsoft.VSCodeInsiders': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.todesktop.230313mzl4w4u92': { contextType: 'folder', captureHint: 'Select project folder' }, // Cursor
  'com.sublimetext.4': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.apple.dt.Xcode': { contextType: 'folder', captureHint: 'Select project folder' },
  'org.vim.MacVim': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.jetbrains.intellij': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.jetbrains.WebStorm': { contextType: 'folder', captureHint: 'Select project folder' },
  'com.jetbrains.pycharm': { contextType: 'folder', captureHint: 'Select project folder' },
  'abnerworks.Typora': { contextType: 'folder', captureHint: 'Select notes folder' },

  // Design Tools - deeplink-based
  'com.figma.Desktop': { contextType: 'deeplink', captureHint: 'Copy link from Figma (⌘L)' },
  'com.bohemiancoding.sketch3': { contextType: 'file', captureHint: 'Select Sketch file', fileTypes: ['sketch'] },
  'com.adobe.illustrator': { contextType: 'file', captureHint: 'Select Illustrator file', fileTypes: ['ai', 'eps'] },
  'com.adobe.Photoshop': { contextType: 'file', captureHint: 'Select Photoshop file', fileTypes: ['psd'] },

  // Browsers - URL-based
  'com.google.Chrome': { contextType: 'url', captureHint: 'Enter URL to open' },
  'com.apple.Safari': { contextType: 'url', captureHint: 'Enter URL to open' },
  'org.mozilla.firefox': { contextType: 'url', captureHint: 'Enter URL to open' },
  'company.thebrowser.Browser': { contextType: 'url', captureHint: 'Enter URL to open' }, // Arc
  'com.brave.Browser': { contextType: 'url', captureHint: 'Enter URL to open' },

  // Communication - deeplink-based
  'com.tinyspeck.slackmacgap': { contextType: 'deeplink', captureHint: 'Copy link to channel/message' },
  'com.microsoft.teams2': { contextType: 'deeplink', captureHint: 'Copy link to channel/chat' },
  'ru.keepcoder.Telegram': { contextType: 'deeplink', captureHint: 'Copy link to chat' },
  'com.hnc.Discord': { contextType: 'deeplink', captureHint: 'Copy link to channel' },

  // Productivity - deeplink-based
  'com.linear': { contextType: 'deeplink', captureHint: 'Copy link to issue or project' },
  'md.obsidian': { contextType: 'deeplink', captureHint: 'Copy link to note (obsidian://...)' },
  'com.notion.id': { contextType: 'deeplink', captureHint: 'Copy link to page' },
  'com.electron.asana2': { contextType: 'deeplink', captureHint: 'Copy link to task or project' },

  // File-based apps
  'com.apple.Preview': { contextType: 'file', captureHint: 'Select file to open', fileTypes: ['pdf', 'png', 'jpg', 'jpeg', 'gif'] },
  'com.apple.iWork.Pages': { contextType: 'file', captureHint: 'Select Pages document', fileTypes: ['pages'] },
  'com.apple.iWork.Numbers': { contextType: 'file', captureHint: 'Select Numbers spreadsheet', fileTypes: ['numbers'] },
  'com.apple.iWork.Keynote': { contextType: 'file', captureHint: 'Select Keynote presentation', fileTypes: ['key'] },

  // Terminal apps - folder-based
  'com.apple.Terminal': { contextType: 'folder', captureHint: 'Select working directory' },
  'com.googlecode.iterm2': { contextType: 'folder', captureHint: 'Select working directory' },
  'dev.warp.Warp-Stable': { contextType: 'folder', captureHint: 'Select working directory' },
  'io.alacritty': { contextType: 'folder', captureHint: 'Select working directory' },
  'net.kovidgoyal.kitty': { contextType: 'folder', captureHint: 'Select working directory' },

  // Apps with no meaningful context
  'com.spotify.client': { contextType: 'none' },
  'com.apple.calculator': { contextType: 'none' },
  'com.apple.systempreferences': { contextType: 'none' },
  'com.1password.1password': { contextType: 'none' },
};

/**
 * Get the preset for an app, with smart fallback based on capabilities
 */
export function getAppPreset(app: ConnectedApp): AppPreset {
  // Check for known preset
  const preset = APP_PRESETS[app.bundleId];
  if (preset) return preset;

  // Fallback: infer from capabilities
  return inferContextType(app);
}

/**
 * Infer context type from app capabilities when no preset exists
 */
function inferContextType(app: ConnectedApp): AppPreset {
  const { capabilities } = app;

  // If app has URL scheme, it likely supports deep links
  if (capabilities.urlScheme) {
    return {
      contextType: 'deeplink',
      captureHint: `Paste ${app.name} link (${capabilities.urlScheme}://...)`,
    };
  }

  // If app has file associations, it's file-based
  if (capabilities.fileAssociations.length > 0) {
    return {
      contextType: 'file',
      captureHint: `Select file to open`,
      fileTypes: capabilities.fileAssociations,
    };
  }

  // Default: no context
  return { contextType: 'none' };
}

/**
 * Get human-readable label for context type
 */
export function getContextTypeLabel(type: ContextType): string {
  switch (type) {
    case 'folder': return 'Project Folder';
    case 'file': return 'File';
    case 'deeplink': return 'Link';
    case 'url': return 'URL';
    case 'none': return 'None';
  }
}
