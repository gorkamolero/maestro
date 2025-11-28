import { useMemo } from 'react';
import { Bot } from 'lucide-react';
import { useAgentSessionsForSpace, formatTimeAgo } from '@/hooks/useAgentSessions';
import { agentVaultActions } from '@/stores/agent-vault.store';
import type { AgentSession } from '@/types/agent-events';
import { cn } from '@/lib/utils';

interface AgentSidebarSectionProps {
  spaceId: string;
}

export function AgentSidebarSection({ spaceId }: AgentSidebarSectionProps) {
  const sessions = useAgentSessionsForSpace(spaceId);

  if (sessions.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">No agents detected in this repo</div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-1.5">
      {sessions.map((session) => (
        <AgentSessionItem
          key={session.id}
          session={session}
          onClick={() => agentVaultActions.openToAgent(session.id)}
        />
      ))}
    </div>
  );
}

interface AgentSessionItemProps {
  session: AgentSession;
  onClick?: () => void;
}

function AgentSessionItem({ session, onClick }: AgentSessionItemProps) {
  const statusStyles = useMemo(
    () => ({
      active: {
        dot: 'bg-green-500',
        dotAnim: 'animate-pulse',
        border: 'border-green-500/30',
        bg: 'bg-green-500/5',
        text: 'text-green-400',
      },
      idle: {
        dot: 'bg-yellow-500',
        dotAnim: '',
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5',
        text: 'text-yellow-400',
      },
      ended: {
        dot: 'bg-gray-500',
        dotAnim: '',
        border: 'border-gray-500/30',
        bg: 'bg-gray-500/5',
        text: 'text-gray-400',
      },
    }),
    []
  );

  const style = statusStyles[session.status];
  const timeAgo = formatTimeAgo(session.lastActivityAt);

  // Generate a summary of the session
  const summary = useMemo(() => {
    if (session.status === 'active') {
      return session.toolUseCount > 0 ? `${session.toolUseCount} tools used` : 'Working...';
    }
    return `Idle ${timeAgo}`;
  }, [session.status, session.toolUseCount, timeAgo]);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-2 rounded-lg border transition-colors text-left',
        style.border,
        style.bg,
        'hover:bg-white/5'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
        <div className={cn('w-2 h-2 rounded-full', style.dot, style.dotAnim)} />
        <span className="text-xs text-muted-foreground">Claude Code</span>
      </div>

      <p className={cn('text-xs truncate pl-5', session.status === 'active' ? style.text : 'text-muted-foreground/60')}>
        {summary}
      </p>
    </button>
  );
}
