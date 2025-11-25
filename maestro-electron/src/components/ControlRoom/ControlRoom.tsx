import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { SpaceCard } from './SpaceCard';
import { cn } from '@/lib/utils';

export function ControlRoom() {
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();

  const handleMaximize = useCallback((spaceId: string) => {
    spacesActions.updateSpaceLastActive(spaceId);
    workspaceActions.maximizeSpace(spaceId);
  }, []);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    const newSpace = spacesActions.addSpace(name);
    handleMaximize(newSpace.id);
  }, [spaces.length, handleMaximize]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Minimal header - no border, subdued */}
      <div className="flex items-center justify-between px-6 py-5">
        <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Spaces
        </h1>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div
          className={cn(
            'grid gap-3',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
        >
          {spaces.map((space) => {
            const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
            return (
              <SpaceCard
                key={space.id}
                space={space}
                tabs={spaceTabs}
                onMaximize={() => handleMaximize(space.id)}
              />
            );
          })}

          {/* New Space - just text, minimal */}
          <button
            type="button"
            onClick={handleNewSpace}
            className={cn(
              'flex items-center justify-center gap-2 p-4 rounded-lg',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-accent/50 transition-colors',
              'min-h-[140px]'
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New space</span>
          </button>
        </div>
      </div>
    </div>
  );
}
