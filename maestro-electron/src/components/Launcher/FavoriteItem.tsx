import { useSnapshot } from 'valtio';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import type { Favorite, ConnectedApp } from '@/types/launcher';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteItemProps {
  favorite: Favorite;
  connectedApp: ConnectedApp;
  onLaunch?: () => void;
}

export function FavoriteItem({ favorite, connectedApp, onLaunch }: FavoriteItemProps) {
  const snap = useSnapshot(launcherStore);
  const isRunning = snap.runningApps.has(connectedApp.bundleId);

  const handleClick = async () => {
    try {
      const result = await launcherActions.launchFavorite(favorite.id);
      if (result.success) {
        onLaunch?.();
      } else if (result.error) {
        console.error('Launch failed:', result.error.message);
      }
    } catch (error) {
      console.error('Failed to launch favorite:', error);
    }
  };

  const handleSaveState = async () => {
    if (!isRunning) {
      console.warn(`${connectedApp.name} is not running`);
      return;
    }
    try {
      await launcherActions.saveState(favorite.id);
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  const handleClearState = () => {
    launcherActions.clearState(favorite.id);
  };

  const handleDelete = () => {
    launcherActions.deleteFavorite(favorite.id);
  };

  const handleEdit = () => {
    launcherStore.editingFavoriteId = favorite.id;
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
            'hover:bg-accent/50 transition-colors text-left',
            'group relative',
            isRunning && 'bg-accent/20'
          )}
        >
          <div className="relative flex-shrink-0">
            <img
              src={connectedApp.icon}
              alt={connectedApp.name}
              className="w-8 h-8 rounded-lg"
            />
            <ExternalLink className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-muted-foreground opacity-60" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{favorite.name}</div>
            {favorite.launchConfig.filePath && (
              <div className="text-xs text-muted-foreground truncate">
                {favorite.launchConfig.filePath.split('/').pop()}
              </div>
            )}
          </div>

          {isRunning && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
          )}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleClick}>Launch</ContextMenuItem>
        <ContextMenuItem
          onClick={() => launcherActions.launchFavorite(favorite.id, false)}
        >
          Launch Without State
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleSaveState} disabled={!isRunning}>
          Save State
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleClearState}
          disabled={!favorite.savedState}
        >
          Clear Saved State
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleEdit}>Edit Favorite...</ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          Remove from Workspace
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
