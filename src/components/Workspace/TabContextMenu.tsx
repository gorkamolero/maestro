import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useSpacesStore } from '@/stores/spaces.store';
import { workspaceActions, type Tab } from '@/stores/workspace.store';
import { FolderInput, Trash2, CircleSlash, CircleCheck } from 'lucide-react';
import { ReactNode } from 'react';

interface TabContextMenuProps {
  tab: Tab;
  children: ReactNode;
}

export function TabContextMenu({ tab, children }: TabContextMenuProps) {
  const { spaces } = useSpacesStore();
  const otherSpaces = spaces.filter(s => s.id !== tab.spaceId);

  const handleMoveToSpace = (targetSpaceId: string) => {
    workspaceActions.moveTabToSpace(tab.id, targetSpaceId);
  };

  const handleToggleDisabled = () => {
    workspaceActions.toggleTabDisabled(tab.id);
  };

  const handleDelete = () => {
    workspaceActions.closeTab(tab.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {/* Enable/Disable toggle */}
        <ContextMenuItem onClick={handleToggleDisabled}>
          {tab.disabled ? (
            <>
              <CircleCheck className="w-4 h-4 mr-2" />
              Enable Tab
            </>
          ) : (
            <>
              <CircleSlash className="w-4 h-4 mr-2" />
              Disable Tab
            </>
          )}
        </ContextMenuItem>
        <ContextMenuSeparator />

        {otherSpaces.length > 0 && (
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to Space
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {otherSpaces.map((space) => (
                  <ContextMenuItem
                    key={space.id}
                    onClick={() => handleMoveToSpace(space.id)}
                  >
                    <span className="mr-2">{space.icon || '📦'}</span>
                    {space.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Close Tab
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
