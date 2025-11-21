import { useSnapshot } from 'valtio';
import { spacesStore, spacesActions } from '@/stores/spaces.store';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Plus, Home, Music, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dock as DockPrimitive, DockIcon } from '@/components/ui/dock';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const SPACE_ICONS: Record<string, any> = {
  home: Home,
  music: Music,
  science: FlaskConical,
};

export function Dock() {
  const { spaces } = useSnapshot(spacesStore);
  const { activeSpaceId } = useSnapshot(workspaceStore);

  const handleAddSpace = () => {
    const spaceNumber = Math.floor(Math.random() * 1000);
    const newSpace = spacesActions.addSpace(`Space ${spaceNumber}`);
    workspaceActions.switchSpace(newSpace.id);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={0}>
        {/* Space dots/icons - Arc Spaces style */}
        {spaces.map((space) => {
          const Icon = SPACE_ICONS[space.icon || 'home'] || Home;
          const isActive = activeSpaceId === space.id;
          const hasActiveSegments = space.segments.filter((s) => s.status === 'active').length > 0;

          return (
            <Tooltip key={space.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => workspaceActions.switchSpace(space.id)}
                  className={cn(
                    'relative w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                    'hover:bg-background/80',
                    isActive ? 'bg-background shadow-sm' : 'bg-muted/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {hasActiveSegments && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p className="text-sm font-medium">{space.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Add space button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleAddSpace}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors border border-dashed border-border"
            >
              <Plus className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            <p className="text-sm">New Space</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
