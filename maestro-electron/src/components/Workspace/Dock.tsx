import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SpaceEditor } from './SpaceEditor';
import { SpaceButton } from './SpaceButton';
import { useState } from 'react';
import type { Space } from '@/types';

export function Dock() {
  const spacesSnap = useSpacesStore();
  const workspaceSnap = useWorkspaceStore();
  const [newSpacePopoverOpen, setNewSpacePopoverOpen] = useState(false);

  const handleCreateSpace = (name: string, icon?: string) => {
    const newSpace = spacesActions.addSpace(name);
    if (icon) {
      spacesActions.updateSpace(newSpace.id, { icon });
    }
    workspaceActions.switchSpace(newSpace.id);
    setNewSpacePopoverOpen(false);
  };

  const handleDeleteSpace = (spaceId: string) => {
    // Find another space to switch to
    const otherSpace = spacesSnap.spaces.find((s) => s.id !== spaceId);
    if (otherSpace) {
      workspaceActions.switchSpace(otherSpace.id);
    }
    spacesActions.removeSpace(spaceId);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={0}>
        {/* Space buttons with morphing edit */}
        {spacesSnap.spaces.map((space) => (
          <Tooltip key={space.id}>
            <TooltipTrigger asChild>
              <div>
                <SpaceButton
                  space={space}
                  isActive={workspaceSnap.activeSpaceId === space.id}
                  onSwitch={() => workspaceActions.switchSpace(space.id)}
                  onDelete={() => handleDeleteSpace(space.id)}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p className="text-sm font-medium">{space.name}</p>
              <p className="text-xs text-muted-foreground">Double-click to edit</p>
            </TooltipContent>
          </Tooltip>
        ))}

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
  );
}
