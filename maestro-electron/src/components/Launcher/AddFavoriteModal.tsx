import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import type { ConnectedApp } from '@/types/launcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal-content';
import { PortalWindow } from '@/components/PortalWindow';
import { View } from '@/components/View';

interface AddFavoriteModalProps {
  workspaceId: string;
}

export function AddFavoriteModal({ workspaceId }: AddFavoriteModalProps) {
  console.log('[AddFavoriteModal] Component called, workspaceId:', workspaceId);
  const snap = useSnapshot(launcherStore);
  console.log('[AddFavoriteModal] snap.isAddModalOpen:', snap.isAddModalOpen);
  const [selectedAppPath, setSelectedAppPath] = useState('');
  const [appInfo, setAppInfo] = useState<ConnectedApp | null>(null);
  const [name, setName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    // eslint-disable-next-line react-hooks/immutability
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
      // Use Electron's native file picker
      const path = await launcherActions.pickApp();
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

  const handlePickFile = async () => {
    if (!appInfo) return;

    try {
      const path = await launcherActions.pickFile(appInfo.id);
      if (path) {
        setFilePath(path);
        // Auto-update name with filename
        const fileName = path.split('/').pop()?.replace(/\.[^.]+$/, '');
        if (fileName) {
          setName(`${appInfo.name} - ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Failed to pick file:', error);
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

  if (!snap.isAddModalOpen) {
    console.log('[AddFavoriteModal] Modal is closed');
    return null;
  }

  console.log('[AddFavoriteModal] Rendering modal');

  return (
    <View style={{
      width: '100%',
      height: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <View style={{ width: 440, height: 320 }}>
        <PortalWindow onClose={handleClose}>
          <ModalContent
            className="w-full h-full relative overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="sr-only">Close</span>
              </button>

              <ModalHeader>
                <ModalTitle>Add Favorite</ModalTitle>
              </ModalHeader>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading app info...
              </div>
            ) : appInfo ? (
              <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <img
                  src={appInfo.icon}
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
          </ModalContent>
        </PortalWindow>
      </View>
    </View>
  );
}
