import { useMemo } from 'react';
import { FolderGit2 } from 'lucide-react';
import { useAgentSessionsForSpace, formatTimeAgo } from '@/hooks/useAgentSessions';
import type { AgentSession } from '@/types/agent-events';
import type { Space } from '@/types';
import { cn } from '@/lib/utils';

interface AgentStatusRowProps {
  space: Space;
}

export function AgentStatusRow({ space }: AgentStatusRowProps) {
  const sessions = useAgentSessionsForSpace(space.id);

  const { active, idle } = useMemo(() => {
    return {
      active: sessions.filter((s) => s.status === 'active'),
      idle: sessions.filter((s) => s.status === 'idle'),
    };
  }, [sessions]);

  // Don't render if no connected repo
  if (!space.connectedRepo) {
    return null;
  }

  // Extract folder name from path
  const folderName = space.connectedRepo.path.split('/').pop() || 'repo';

  // Get activity summary
  const latestActive = active[0];
  const activityText = latestActive
    ? getToolSummary(latestActive)
    : idle[0]
      ? `Idle ${formatTimeAgo(idle[0].lastActivityAt)}`
      : null;

  const hasAgents = sessions.length > 0;

  return (
    <div className="border-t border-white/[0.06]">
      <div className="px-3 py-2">
        {/* Connected repo row */}
        <div className="flex items-center gap-2">
          {/* Repo icon - muted */}
          <FolderGit2 className="w-3 h-3 text-white/30 flex-shrink-0" />

          {/* Repo name - typography forward */}
          <span className="text-[11px] font-medium text-white/50 truncate">
            {folderName}
          </span>

          {/* Agent status indicators - right aligned */}
          {hasAgents && (
            <div className="flex items-center gap-1.5 ml-auto">
              {active.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 animate-pulse-slow" />
                  <span className="text-[10px] tabular-nums text-green-400/80">
                    {active.length}
                  </span>
                </div>
              )}
              {idle.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                  <span className="text-[10px] tabular-nums text-yellow-400/60">
                    {idle.length}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity summary - only when agents exist */}
        {hasAgents && activityText && (
          <div className="mt-1 pl-5">
            <span
              className={cn(
                'text-[10px] truncate block',
                active.length > 0 ? 'text-white/40' : 'text-white/25'
              )}
            >
              {activityText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get a human-readable summary of what the agent last did
 */
function getToolSummary(session: AgentSession): string {
  if (session.toolUseCount > 0) {
    return `${session.toolUseCount} tools used`;
  }
  return 'Working...';
}
