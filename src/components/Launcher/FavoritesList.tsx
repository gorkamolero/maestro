import { useSnapshot } from 'valtio';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import { FavoriteItem } from './FavoriteItem';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FavoritesListProps {
  workspaceId: string;
}

export function FavoritesList({ workspaceId }: FavoritesListProps) {
  const snap = useSnapshot(launcherStore);
  const favorites = snap.favoritesByWorkspace[workspaceId] || [];

  const handleAddFavorite = () => {
    launcherStore.isAddModalOpen = true;
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Connected Apps
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleAddFavorite}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {favorites.length === 0 ? (
        <div className="px-3 py-8 text-center">
          <p className="text-xs text-muted-foreground mb-3">
            No connected apps yet
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFavorite}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Favorite
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {favorites.map((favorite) => {
            const app = launcherActions.getConnectedApp(favorite.connectedAppId);
            if (!app) return null;

            return <FavoriteItem key={favorite.id} favorite={favorite} connectedApp={app} />;
          })}
        </div>
      )}
    </div>
  );
}
