import { useState } from 'react';
import { Terminal, Globe, AppWindow, CheckSquare, StickyNote, Bot, FolderGit2 } from 'lucide-react';
import { workspaceActions } from '@/stores/workspace.store';
import { windowsActions } from '@/stores/windows.store';
import { launcherActions } from '@/stores/launcher.store';
import { spacesActions } from '@/stores/spaces.store';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AddTabPopoverProps {
  spaceId: string;
  children: React.ReactNode;
}

const TAB_OPTIONS = [
  {
    type: 'terminal' as const,
    label: 'Terminal',
    icon: Terminal,
  },
  {
    type: 'browser' as const,
    label: 'Browser',
    icon: Globe,
  },
  {
    type: 'agent' as const,
    label: 'Agent',
    icon: Bot,
  },
  {
    type: 'notes' as const,
    label: 'Notes',
    icon: StickyNote,
  },
  {
    type: 'tasks' as const,
    label: 'Tasks',
    icon: CheckSquare,
  },
  {
    type: 'app' as const,
    label: 'App',
    icon: AppWindow,
  },
] as const;

export function AddTabPopover({ spaceId, children }: AddTabPopoverProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectRepo = async () => {
    setIsLoading(true);
    try {
      const path = await window.electron.invoke('dialog:openDirectory');
      if (path) {
        // Update space with connected repo
        spacesActions.updateSpace(spaceId, {
          connectedRepo: {
            path,
            connectedAt: new Date().toISOString(),
            monitorAgents: true,
          },
        });

        // Connect to agent monitor service
        await window.agentMonitor.connectRepo({
          path,
          spaceId,
          options: {
            monitoringEnabled: true,
            autoCreateSegments: false,
          },
        });
      }
    } catch (error) {
      console.error('[AddTabPopover] Failed to connect repo:', error);
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleSelectOption = async (type: (typeof TAB_OPTIONS)[number]['type']) => {
    if (type === 'app') {
      // Custom app flow - open file picker
      setIsLoading(true);
      try {
        const path = await launcherActions.pickApp();
        if (path) {
          const app = await launcherActions.registerApp(path);
          // Create app-launcher tab (no window needed - just launches the app)
          workspaceActions.openTab(spaceId, 'app-launcher', app.name, {
            appLauncherConfig: {
              connectedAppId: app.id,
              icon: app.icon,
              color: null,
              launchConfig: {
                filePath: null,
                deepLink: null,
                launchMethod: 'app-only',
              },
              savedState: null,
            },
          });
        }
      } catch (error) {
        console.error('Failed to add app:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (type === 'agent') {
      // Agent tab with default config
      const newTab = workspaceActions.openTab(spaceId, 'agent', 'Agent', {
        agentConfig: {
          workDir: '', // Will be set in AgentDrawer
          permissionMode: 'askUser',
        },
      });
      // Open window for the agent
      windowsActions.openWindow(newTab.id, 'floating');
    } else {
      // Native tab types - open in floating window
      const titles: Record<string, string> = {
        terminal: 'Terminal',
        browser: 'New Tab',
        notes: 'Notes',
        tasks: 'Tasks',
      };
      const newTab = workspaceActions.openTab(spaceId, type, titles[type] || type);
      // Open window for the tab
      windowsActions.openWindow(newTab.id, 'floating');
    }
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Don't allow closing while loading (file picker is open)
    if (!newOpen && isLoading) return;
    setOpen(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-48 p-1"
        side="bottom"
        align="start"
        sideOffset={4}
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
      >
        {isLoading ? (
          <div className="py-3 px-2 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex flex-col">
            {TAB_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectOption(option.type);
                }}
                className={cn(
                  'flex items-center gap-3 px-2 py-2 rounded-md text-left',
                  'hover:bg-accent transition-colors',
                  'text-sm'
                )}
              >
                <option.icon className="w-4 h-4 text-muted-foreground" />
                <span>{option.label}</span>
              </button>
            ))}

            {/* Separator */}
            <div className="h-px bg-border my-1" />

            {/* Connect Repository */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleConnectRepo();
              }}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-left',
                'hover:bg-accent transition-colors',
                'text-sm'
              )}
            >
              <FolderGit2 className="w-4 h-4 text-muted-foreground" />
              <span>Connect Repo</span>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
