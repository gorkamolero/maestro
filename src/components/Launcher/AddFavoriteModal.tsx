import { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { open } from '@tauri-apps/plugin-opener';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import type { ConnectedApp } from '@/types/launcher';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddFavoriteModalProps {
  workspaceId: string;
}

export function AddFavoriteModal({ workspaceId }: AddFavoriteModalProps) {
  const snap = useSnapshot(launcherStore);
  const [selectedAppPath, setSelectedAppPath] = useState('');
  const [appInfo, setAppInfo] = useState<ConnectedApp | null>(null);
  const [name, setName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    launcherStore.isAddModalOpen = false;
    resetForm();
  };

  const resetForm = () => {
    setSelectedAppPath('');
    setAppInfo(null);
    setName('');
    setFilePath('');
    setDeepLink('');
  };

  const handlePickApplication = async () => {
    try {
      // Note: Tauri's file picker would be implemented here
      // For now, this is a simplified version that would need the proper file picker implementation
      const path = prompt('Enter application path (e.g., /Applications/Safari.app):');
      if (!path) return;

      setIsLoading(true);
      const app = await launcherActions.registerApp(path);
      setAppInfo(app);
      setSelectedAppPath(path);
      setName(app.name);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load app info:', error);
      setIsLoading(false);
    }
  };

  const handlePickFile = () => {
    // Simplified file picker - would use Tauri's file picker in production
    const path = prompt('Enter file path:');
    if (path) {
      setFilePath(path);
      // Auto-update name with filename
      const fileName = path.split('/').pop()?.replace(/\.[^.]+$/, '');
      if (fileName && appInfo) {
        setName(`${appInfo.name} - ${fileName}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedAppPath || !name) return;

    try {
      await launcherActions.addFavorite(
        workspaceId,
        selectedAppPath,
        name,
        filePath || null,
        deepLink || null
      );
      handleClose();
    } catch (error) {
      console.error('Failed to add favorite:', error);
    }
  };

  // Auto-open picker when modal opens
  useEffect(() => {
    if (snap.isAddModalOpen && !appInfo) {
      handlePickApplication();
    }
  }, [snap.isAddModalOpen]);

  return (
    <Dialog open={snap.isAddModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Favorite</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading app info...
          </div>
        ) : appInfo ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <img
                src={`data:image/png;base64,${appInfo.icon}`}
                alt={appInfo.name}
                className="w-16 h-16 rounded-xl"
              />
              <div className="flex-1">
                <div className="font-medium">{appInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {appInfo.bundleId}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handlePickApplication}>
                Change
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Favorite"
              />
            </div>

            {appInfo.capabilities.fileAssociations.length > 0 && (
              <div className="space-y-2">
                <Label>Open with file (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="No file selected"
                    readOnly
                  />
                  <Button variant="outline" onClick={handlePickFile}>
                    Browse
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported: {appInfo.capabilities.fileAssociations.join(', ')}
                </p>
              </div>
            )}

            {appInfo.capabilities.urlScheme && (
              <div className="space-y-2">
                <Label htmlFor="deeplink">Or use deep link (advanced)</Label>
                <Input
                  id="deeplink"
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  placeholder={`${appInfo.capabilities.urlScheme}://...`}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!name}>
                Add Favorite
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Select an application</p>
            <Button onClick={handlePickApplication}>Choose Application</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
