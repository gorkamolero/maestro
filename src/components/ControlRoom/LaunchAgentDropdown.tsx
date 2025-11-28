import { useCallback, useMemo } from 'react';
import { Bot, Monitor, Smartphone, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { workspaceActions } from '@/stores/workspace.store';
import { windowsActions } from '@/stores/windows.store';
import { useAgentSessionsForSpace } from '@/hooks/useAgentSessions';
import { cn } from '@/lib/utils';
import type { Space } from '@/types';

interface LaunchAgentDropdownProps {
  space: Space;
}

export function LaunchAgentDropdown({ space }: LaunchAgentDropdownProps) {
  const sessions = useAgentSessionsForSpace(space.id);

  // Check if there are active agents for this space
  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === 'active').length,
    [sessions]
  );

  const hasRepo = Boolean(space.connectedRepo?.path);

  const handleLaunchLocal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      const repoPath = space.connectedRepo?.path;
      if (!repoPath) {
        console.warn('[LaunchAgent] No connected repo for space:', space.id);
        return;
      }

      // Create a terminal tab with claude command
      const newTab = workspaceActions.openTab(space.id, 'terminal', '🤖 Claude Code', {
        terminalState: {
          buffer: '',
          workingDir: repoPath,
          scrollPosition: 0,
          theme: 'termius-dark',
          cwd: repoPath,
          initialCommand: 'claude',
          isAgentTerminal: true,
        },
      });

      // Register pending tab for Jump to Terminal feature
      window.agentMonitor.registerPendingAgentTab({
        tabId: newTab.id,
        spaceId: space.id,
        repoPath,
      });

      // Open the window
      windowsActions.openWindow(newTab.id, 'floating');
    },
    [space.connectedRepo, space.id]
  );

  const handleLaunchMobile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      const repoPath = space.connectedRepo?.path;
      if (!repoPath) {
        console.warn('[LaunchAgent] No connected repo for space:', space.id);
        return;
      }

      // Create a terminal tab with happy command
      const newTab = workspaceActions.openTab(space.id, 'terminal', '📱 Claude Code (Mobile)', {
        terminalState: {
          buffer: '',
          workingDir: repoPath,
          scrollPosition: 0,
          theme: 'termius-dark',
          cwd: repoPath,
          initialCommand: 'happy',
          isAgentTerminal: true,
        },
      });

      // Register pending tab for Jump to Terminal feature
      window.agentMonitor.registerPendingAgentTab({
        tabId: newTab.id,
        spaceId: space.id,
        repoPath,
      });

      // Open the window
      windowsActions.openWindow(newTab.id, 'floating');
    },
    [space.connectedRepo, space.id]
  );

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex items-center gap-0.5 p-1.5 rounded transition-colors hover:bg-accent',
                !hasRepo && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!hasRepo}
            >
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              {activeCount > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
              <ChevronDown className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">
            {hasRepo ? 'Launch Claude Code agent' : 'Connect a repo to launch agents'}
          </p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleLaunchLocal} className="gap-3">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Launch Local</span>
            <span className="text-xs text-muted-foreground">Run Claude Code here</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLaunchMobile} className="gap-3">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">Launch Mobile</span>
            <span className="text-xs text-muted-foreground">Control from your phone</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
