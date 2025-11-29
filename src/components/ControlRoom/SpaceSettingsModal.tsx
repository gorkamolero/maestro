import { useState, useCallback } from 'react';
import { Folder, FolderOpen, Link2Off, Bot, Globe, Plus, Trash2, ExternalLink } from 'lucide-react';
import { spacesActions } from '@/stores/spaces.store';
import type { Space } from '@/types';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SpaceSettingsModalProps {
  space: Space;
  isOpen: boolean;
  onClose: () => void;
}

export function SpaceSettingsModal({ space, isOpen, onClose }: SpaceSettingsModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [isAddingBookmark, setIsAddingBookmark] = useState(false);

  const handleConnectRepo = useCallback(async () => {
    setIsConnecting(true);
    try {
      const path = await window.electron.invoke('dialog:openDirectory');

      if (path) {
        // Update space with connected repo
        spacesActions.updateSpace(space.id, {
          connectedRepo: {
            path,
            connectedAt: new Date().toISOString(),
            monitorAgents: true,
          },
        });

        // Connect to agent monitor service
        await window.agentMonitor.connectRepo({
          path,
          spaceId: space.id,
          options: {
            monitoringEnabled: true,
            autoCreateSegments: false,
          },
        });
      }
    } catch (error) {
      console.error('[SpaceSettingsModal] Failed to connect repo:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [space.id]);

  const handleDisconnectRepo = useCallback(async () => {
    if (!space.connectedRepo) return;

    try {
      // Disconnect from agent monitor service
      await window.agentMonitor.disconnectRepo(space.connectedRepo.path);

      // Remove from space
      spacesActions.updateSpace(space.id, {
        connectedRepo: undefined,
      });
    } catch (error) {
      console.error('[SpaceSettingsModal] Failed to disconnect repo:', error);
    }
  }, [space.id, space.connectedRepo]);

  const handleToggleMonitoring = useCallback(
    (enabled: boolean) => {
      if (!space.connectedRepo) return;

      spacesActions.updateSpace(space.id, {
        connectedRepo: {
          ...space.connectedRepo,
          monitorAgents: enabled,
        },
      });
    },
    [space.id, space.connectedRepo]
  );

  const handleAddBookmark = useCallback(() => {
    if (!newBookmarkName.trim() || !newBookmarkUrl.trim()) return;

    // Normalize URL
    let url = newBookmarkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    spacesActions.addBookmark(space.id, newBookmarkName.trim(), url);
    setNewBookmarkName('');
    setNewBookmarkUrl('');
    setIsAddingBookmark(false);
  }, [space.id, newBookmarkName, newBookmarkUrl]);

  const handleRemoveBookmark = useCallback((bookmarkId: string) => {
    spacesActions.removeBookmark(space.id, bookmarkId);
  }, [space.id]);

  // Extract folder name from path for display
  const folderName = space.connectedRepo?.path.split('/').pop() || '';
  const bookmarks = space.bookmarks || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{space.icon || '📁'}</span>
            {space.name} Settings
          </DialogTitle>
          <DialogDescription>Configure repository connection and agent monitoring</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Repository Connection Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Folder className="w-4 h-4 text-muted-foreground" />
              Connected Repository
            </h3>

            {space.connectedRepo ? (
              <div className="space-y-3">
                {/* Connected repo display */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{folderName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {space.connectedRepo.path}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectRepo}
                    className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Link2Off className="w-4 h-4" />
                  </Button>
                </div>

                {/* Agent monitoring toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="agent-monitoring" className="text-sm font-medium">
                        Agent Monitoring
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Detect Claude Code sessions in this repo
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="agent-monitoring"
                    checked={space.connectedRepo.monitorAgents}
                    onCheckedChange={handleToggleMonitoring}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect a repository to enable agent monitoring. Claude Code sessions in this
                  folder will appear in this Space.
                </p>
                <Button
                  onClick={handleConnectRepo}
                  disabled={isConnecting}
                  className="w-full"
                  variant="outline"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  {isConnecting ? 'Selecting...' : 'Connect Repository'}
                </Button>
              </div>
            )}
          </div>

          {/* Bookmarks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Remote View Bookmarks
              </h3>
              {!isAddingBookmark && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingBookmark(true)}
                  className="h-7 px-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Add localhost URLs to view on mobile (e.g., localhost:3000)
            </p>

            {/* Add bookmark form */}
            {isAddingBookmark && (
              <div className="space-y-2 p-3 rounded-lg border border-border bg-accent/30">
                <Input
                  placeholder="Name (e.g., Dev Server)"
                  value={newBookmarkName}
                  onChange={(e) => setNewBookmarkName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="URL (e.g., localhost:3000)"
                  value={newBookmarkUrl}
                  onChange={(e) => setNewBookmarkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAddBookmark}
                    disabled={!newBookmarkName.trim() || !newBookmarkUrl.trim()}
                    className="flex-1 h-7"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingBookmark(false);
                      setNewBookmarkName('');
                      setNewBookmarkUrl('');
                    }}
                    className="h-7"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Bookmark list */}
            {bookmarks.length > 0 ? (
              <div className="space-y-1">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-accent/20 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{bookmark.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{bookmark.url}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : !isAddingBookmark ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No bookmarks yet
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
