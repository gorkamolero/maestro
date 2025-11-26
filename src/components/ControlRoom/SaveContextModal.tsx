import { useState, useEffect } from 'react';
import { FolderOpen, Link, FileText, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { workspaceActions, type Tab } from '@/stores/workspace.store';
import { launcherActions } from '@/stores/launcher.store';
import { getAppPreset, type ContextType } from '@/lib/app-presets';

interface SaveContextModalProps {
  tab: Tab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveContextModal({ tab, open, onOpenChange }: SaveContextModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset input value when modal opens or tab changes
  const filePath = tab.appLauncherConfig?.launchConfig.filePath;
  const deepLink = tab.appLauncherConfig?.launchConfig.deepLink;
  useEffect(() => {
    if (open) {
      setInputValue(filePath || deepLink || '');
    }
  }, [open, tab.id, filePath, deepLink]);

  // Get the connected app to determine context type
  const connectedApp = tab.appLauncherConfig?.connectedAppId
    ? launcherActions.getConnectedApp(tab.appLauncherConfig.connectedAppId)
    : null;

  const preset = connectedApp ? getAppPreset(connectedApp) : { contextType: 'none' as ContextType };
  const { contextType, captureHint } = preset;

  const handleBrowseFolder = async () => {
    setIsLoading(true);
    try {
      const path = await window.electron?.invoke('dialog:openDirectory');
      if (path) {
        setInputValue(path);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowseFile = async () => {
    setIsLoading(true);
    try {
      const filters = preset.fileTypes
        ? [{ name: 'Supported Files', extensions: preset.fileTypes }]
        : undefined;
      const path = await window.electron?.invoke('dialog:openFile', filters);
      if (path) {
        setInputValue(path);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Basic validation for URLs/deeplinks
  const isValidUrl = (value: string): boolean => {
    // For URLs, check it starts with http:// or https://
    if (contextType === 'url') {
      return /^https?:\/\/.+/.test(value);
    }
    // For deeplinks, check it has a scheme (anything://)
    if (contextType === 'deeplink') {
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/.+/.test(value);
    }
    return true;
  };

  const getValidationError = (): string | null => {
    const value = inputValue.trim();
    if (!value) return null;

    if (contextType === 'url' && !isValidUrl(value)) {
      return 'Please enter a valid URL (e.g., https://...)';
    }
    if (contextType === 'deeplink' && !isValidUrl(value)) {
      return 'Please enter a valid link (e.g., figma://...)';
    }
    return null;
  };

  const validationError = getValidationError();

  const handleSave = () => {
    const value = inputValue.trim();

    if (!value) {
      // Clear context - use single unified clear
      handleClear();
      return;
    }

    // Don't save if validation fails
    if (validationError) {
      return;
    }

    if (contextType === 'folder' || contextType === 'file') {
      // Store in filePath field
      workspaceActions.setAppLauncherFilePath(tab.id, value);
    } else if (contextType === 'deeplink' || contextType === 'url') {
      // Store in deepLink field
      if (tab.appLauncherConfig) {
        workspaceActions.updateAppLauncherConfig(tab.id, {
          launchConfig: {
            ...tab.appLauncherConfig.launchConfig,
            filePath: null, // Clear any existing file path
            deepLink: value,
            launchMethod: 'deeplink',
          },
        });
      }
    }
    onOpenChange(false);
  };

  const handleClear = () => {
    setInputValue('');
    // Single unified clear - reset both fields
    if (tab.appLauncherConfig) {
      workspaceActions.updateAppLauncherConfig(tab.id, {
        launchConfig: {
          ...tab.appLauncherConfig.launchConfig,
          filePath: null,
          deepLink: null,
          launchMethod: 'app-only',
        },
      });
    }
    onOpenChange(false);
  };

  // If no context type, show a simple message
  if (contextType === 'none') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connectedApp && tab.appLauncherConfig?.icon && (
                <img src={tab.appLauncherConfig.icon} alt="" className="w-6 h-6 rounded" />
              )}
              {connectedApp?.name || 'App'}
            </DialogTitle>
            <DialogDescription>
              This app will just open when you start the workspace. No context to save.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getIcon = () => {
    switch (contextType) {
      case 'folder': return <FolderOpen className="w-5 h-5" />;
      case 'file': return <FileText className="w-5 h-5" />;
      case 'deeplink': return <Link className="w-5 h-5" />;
      case 'url': return <Globe className="w-5 h-5" />;
      default: return null;
    }
  };

  const getTitle = () => {
    switch (contextType) {
      case 'folder': return 'Set Project Folder';
      case 'file': return 'Set File';
      case 'deeplink': return 'Set Link';
      case 'url': return 'Set URL';
      default: return 'Set Context';
    }
  };

  const getPlaceholder = () => {
    switch (contextType) {
      case 'folder': return '/path/to/project';
      case 'file': return '/path/to/file';
      case 'deeplink': return `${connectedApp?.capabilities.urlScheme || 'app'}://...`;
      case 'url': return 'https://...';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {connectedApp && tab.appLauncherConfig?.icon && (
              <img src={tab.appLauncherConfig.icon} alt="" className="w-6 h-6 rounded" />
            )}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {captureHint || `Set the ${contextType} for ${connectedApp?.name || 'this app'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={getPlaceholder()}
                className="pr-10"
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {(contextType === 'folder' || contextType === 'file') && (
              <Button
                variant="outline"
                size="icon"
                onClick={contextType === 'folder' ? handleBrowseFolder : handleBrowseFile}
                disabled={isLoading}
              >
                {getIcon()}
              </Button>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          {/* Current context indicator */}
          {tab.appLauncherConfig?.launchConfig.filePath && (
            <p className="text-xs text-muted-foreground">
              Current: {tab.appLauncherConfig.launchConfig.filePath}
            </p>
          )}
          {tab.appLauncherConfig?.launchConfig.deepLink && (
            <p className="text-xs text-muted-foreground truncate">
              Current: {tab.appLauncherConfig.launchConfig.deepLink}
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleClear} className="text-muted-foreground">
            Clear Context
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!!validationError}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
