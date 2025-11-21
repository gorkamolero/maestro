import { useSnapshot } from 'valtio';
import { spacesStore, spacesActions } from '@/stores/spaces.store';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Plus, Home, Music, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dock as DockPrimitive, DockIcon } from '@/components/ui/dock';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpaceEditor } from './SpaceEditor';
import { ResourcePanel } from '@/components/Monitor/ResourcePanel';
import { useState } from 'react';

const SPACE_ICONS: Record<string, any> = {
  home: Home,
  music: Music,
  science: FlaskConical,
};

export function Dock() {
  const { spaces } = useSnapshot(spacesStore);
  const { activeSpaceId } = useSnapshot(workspaceStore);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [newSpacePopoverOpen, setNewSpacePopoverOpen] = useState(false);

  const handleCreateSpace = (name: string, icon?: string) => {
    const newSpace = spacesActions.addSpace(name);
    if (icon) {
      spacesActions.updateSpace(newSpace.id, { icon });
    }
    workspaceActions.switchSpace(newSpace.id);
    setNewSpacePopoverOpen(false);
  };

  const handleUpdateSpace = (spaceId: string, name: string, icon?: string) => {
    spacesActions.updateSpace(spaceId, { name, icon });
    setEditingSpaceId(null);
  };

  const handleDeleteSpace = (spaceId: string) => {
    // Find another space to switch to
    const otherSpace = spaces.find((s) => s.id !== spaceId);
    if (otherSpace) {
      workspaceActions.switchSpace(otherSpace.id);
    }
    spacesActions.removeSpace(spaceId);
    setEditingSpaceId(null);
  };

  return (
    <div className="space-y-3">
      {/* Resource Monitor */}
      <div className="px-2 py-2 bg-background/50 rounded-lg border border-border/50">
        <ResourcePanel />
      </div>

      {/* Space Switcher */}
      <div className="flex items-center gap-2">
        <TooltipProvider delayDuration={0}>
          {/* Space dots/icons - Arc Spaces style */}
          {spaces.map((space) => {
          const Icon = SPACE_ICONS[space.icon || 'home'] || Home;
          const isActive = activeSpaceId === space.id;
          const hasActiveSegments = space.segments.filter((s) => s.status === 'active').length > 0;
          const isEditing = editingSpaceId === space.id;

          return (
            <Popover
              key={space.id}
              open={isEditing}
              onOpenChange={(open) => {
                if (!open) setEditingSpaceId(null);
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => workspaceActions.switchSpace(space.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setEditingSpaceId(space.id);
                      }}
                      className={cn(
                        'relative w-8 h-8 rounded-lg flex items-center justify-center transition-all group',
                        'hover:bg-background/80',
                        isActive ? 'bg-background shadow-sm' : 'bg-muted/50'
                      )}
                    >
                      {space.icon ? (
                        <span className="text-lg">{space.icon}</span>
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      {hasActiveSegments && (
                        <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      {isActive && (
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-r-full" />
                      )}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p className="text-sm font-medium">{space.name}</p>
                  <p className="text-xs text-muted-foreground">Right-click to edit</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent side="right" align="start" className="w-64 p-3">
                <SpaceEditor
                  space={space}
                  mode="edit"
                  onSave={(name, icon) => handleUpdateSpace(space.id, name, icon)}
                  onDelete={() => handleDeleteSpace(space.id)}
                  onCancel={() => setEditingSpaceId(null)}
                />
              </PopoverContent>
            </Popover>
          );
        })}

        {/* Add space button */}
        <Popover open={newSpacePopoverOpen} onOpenChange={setNewSpacePopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors border border-dashed border-border">
                  <Plus className="w-4 h-4" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p className="text-sm">New Space</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="right" align="start" className="w-64 p-3">
            <SpaceEditor
              mode="create"
              onSave={handleCreateSpace}
              onCancel={() => setNewSpacePopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
        </TooltipProvider>
      </div>
    </div>
  );
}
