import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { SpaceCard } from './SpaceCard';
import { cn } from '@/lib/utils';

export function ControlRoom() {
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
  }, [spaces.length]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Horizontal scrolling spaces */}
      <div className="flex-1 flex items-stretch overflow-x-auto overflow-y-hidden px-6 py-6 gap-4">
        {spaces.map((space) => {
          const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
          return (
            <SpaceCard
              key={space.id}
              space={space}
              tabs={spaceTabs}
            />
          );
        })}

        {/* New Space button - Zed/Telegram style */}
        <button
          type="button"
          onClick={handleNewSpace}
          className={cn(
            'flex-shrink-0 flex flex-col items-center justify-center gap-3',
            'w-[280px] rounded-lg',
            'text-muted-foreground hover:text-foreground',
            'bg-transparent hover:bg-accent',
            'border border-dashed border-border hover:border-transparent',
            'transition-all duration-150'
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">New space</span>
        </button>
      </div>
    </div>
  );
}
