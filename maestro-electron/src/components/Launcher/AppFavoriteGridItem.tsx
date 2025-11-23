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
import { cn } from '@/lib/utils';

interface AppFavoriteGridItemProps {
  favorite: Favorite;
  connectedApp: ConnectedApp;
}

export function AppFavoriteGridItem({ favorite, connectedApp }: AppFavoriteGridItemProps) {
  const snap = useSnapshot(launcherStore);
  const isRunning = snap.runningApps.has(connectedApp.bundleId);

  const handleClick = async () => {
    try {
      const result = await launcherActions.launchFavorite(favorite.id);
      if (result.error) {
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
            'w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center',
            'relative group transition-colors',
            isRunning && 'ring-1 ring-green-500/50'
          )}
          title={favorite.name}
        >
          {/* App Icon */}
          <img
            src={connectedApp.icon}
            alt={connectedApp.name}
            className="w-7 h-7 rounded-md"
          />

          {/* Running indicator */}
          {isRunning && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-background animate-pulse" />
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
