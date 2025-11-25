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
    // Update last active timestamp
    spacesActions.updateSpaceLastActive(spaceId);
    // Switch to workspace view
    workspaceActions.maximizeSpace(spaceId);
  }, []);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    const newSpace = spacesActions.addSpace(name);
    // Immediately maximize the new space
    handleMaximize(newSpace.id);
  }, [spaces.length, handleMaximize]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-xl font-semibold">Control Room</h1>
        <div className="flex items-center gap-2">
          {/* View toggle could go here */}
        </div>
      </div>

      {/* Grid of Space Cards */}
      <div className="flex-1 overflow-auto p-6">
        <div
          className={cn(
            'grid gap-4',
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

          {/* New Space Card */}
          <button
            type="button"
            onClick={handleNewSpace}
            className={cn(
              'flex flex-col items-center justify-center p-4 rounded-xl',
              'border-2 border-dashed border-border',
              'bg-muted/20 hover:bg-muted/40 transition-colors',
              'min-h-[180px] cursor-pointer'
            )}
          >
            <Plus className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">New Space</span>
          </button>
        </div>
      </div>
    </div>
  );
}
