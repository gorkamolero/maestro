import { useMemo } from 'react';
import { FolderGit2, Loader2 } from 'lucide-react';
import { useAgentSessionsWithLoading } from '@/hooks/useAgentSessions';
import { agentVaultActions } from '@/stores/agent-vault.store';
import type { AgentSession } from '@/types/agent-events';
import type { Space } from '@/types';
import { cn } from '@/lib/utils';

interface AgentStatusRowProps {
  space: Space;
}

export function AgentStatusRow({ space }: AgentStatusRowProps) {
  const { sessions, isLoading, isInitialized } = useAgentSessionsWithLoading(space.id);

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

  // Show loading state while initializing
  const showLoading = !isInitialized || isLoading;

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
          <div className="flex items-center gap-1.5 ml-auto">
            {showLoading ? (
              /* Loading spinner while scanning for agents */
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 text-white/30 animate-spin" />
                <span className="text-[10px] text-white/30">Scanning...</span>
              </div>
            ) : hasAgents ? (
              /* Agent counts when found */
              <>
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
              </>
            ) : null}
          </div>
        </div>

        {/* Agent sessions - clickable to open vault */}
        {hasAgents && (
          <div className="mt-1 pl-5 space-y-0.5">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => agentVaultActions.openToAgent(s.id)}
                className={cn(
                  'text-[10px] truncate block w-full text-left',
                  'hover:text-white/60 transition-colors cursor-pointer',
                  s.status === 'active' ? 'text-white/40' : 'text-white/25'
                )}
              >
                {s.status === 'active' ? '● ' : '○ '}
                {getToolSummary(s)}
              </button>
            ))}
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
