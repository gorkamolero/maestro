import { useCallback, useMemo } from 'react';
import { Archive, RotateCcw, Trash2, Globe, Terminal, Bot } from 'lucide-react';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import type { Space } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VaultDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VaultDrawer({ open, onOpenChange }: VaultDrawerProps) {
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();

  // Get inactive spaces (vault)
  const inactiveSpaces = useMemo(
    () => spaces.filter((space) => space.isActive === false),
    [spaces]
  );

  // Calculate tab counts for each inactive space
  const getTabCounts = useCallback(
    (spaceId: string) => {
      const spaceTabs = tabs.filter((tab) => tab.spaceId === spaceId);
      return {
        browsers: spaceTabs.filter((t) => t.type === 'browser').length,
        terminals: spaceTabs.filter((t) => t.type === 'terminal').length,
        agents: spaceTabs.filter((t) => t.type === 'agent').length,
      };
    },
    [tabs]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" />
            <SheetTitle>Vault</SheetTitle>
          </div>
          <SheetDescription>
            {inactiveSpaces.length === 0
              ? 'No spaces in the vault'
              : `${inactiveSpaces.length} space${inactiveSpaces.length !== 1 ? 's' : ''} archived`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {inactiveSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Archive className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                Move spaces to the vault to hide them from the main view.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2">
                Vaulting closes all browser tabs, terminals, and agents to free resources.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {inactiveSpaces.map((space) => (
                <VaultSpaceItem
                  key={space.id}
                  space={space}
                  tabCounts={getTabCounts(space.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface VaultSpaceItemProps {
  space: Space;
  tabCounts: { browsers: number; terminals: number; agents: number };
}

function VaultSpaceItem({ space, tabCounts }: VaultSpaceItemProps) {
  const handleRestore = useCallback(() => {
    spacesActions.activateSpace(space.id);
  }, [space.id]);

  const handleDelete = useCallback(() => {
    spacesActions.removeSpace(space.id);
  }, [space.id]);

  const hasResources = tabCounts.browsers > 0 || tabCounts.terminals > 0 || tabCounts.agents > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg',
          'bg-accent/30 hover:bg-accent/50',
          'border border-border/30 hover:border-border/50',
          'transition-colors'
        )}
        style={{
          borderLeftColor: space.primaryColor,
          borderLeftWidth: 3,
        }}
      >
        {/* Icon */}
        <span className="text-lg flex-shrink-0">{space.icon || '📁'}</span>

        {/* Name and info */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{space.name}</span>
          {space.next ? (
            <span className="text-xs text-muted-foreground truncate block">{space.next}</span>
          ) : hasResources ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {tabCounts.browsers > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5">
                      <Globe className="w-3 h-3" />
                      {tabCounts.browsers}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{tabCounts.browsers} browser tab{tabCounts.browsers !== 1 ? 's' : ''} (closed)</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {tabCounts.terminals > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5">
                      <Terminal className="w-3 h-3" />
                      {tabCounts.terminals}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{tabCounts.terminals} terminal{tabCounts.terminals !== 1 ? 's' : ''} (stopped)</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {tabCounts.agents > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5">
                      <Bot className="w-3 h-3" />
                      {tabCounts.agents}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{tabCounts.agents} agent{tabCounts.agents !== 1 ? 's' : ''} (stopped)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRestore}
                className={cn(
                  'p-1.5 rounded-md',
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-background/50',
                  'transition-colors'
                )}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Restore space</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleDelete}
                className={cn(
                  'p-1.5 rounded-md',
                  'text-muted-foreground hover:text-destructive',
                  'hover:bg-destructive/10',
                  'transition-colors'
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Delete permanently</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
