// DetailView - Single agent activity feed using AI Elements

import { motion } from 'motion/react';
import { ArrowLeft, Minus, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import { useAgentMonitorStore } from '@/stores/agent-monitor.store';
import type { AgentSession } from '@/types/agent-events';
import { AgentTypeIcon, AGENT_TYPE_NAMES, AGENT_TYPE_COLORS } from './AgentIcons';
import { AgentConversation } from '@/components/AgentConversation';

interface DetailViewProps {
  session: AgentSession;
  onBack: () => void;
  onCollapse: () => void;
  onJumpToTerminal?: (tabId: string, spaceId: string) => void;
}

export function DetailView({ session, onBack, onCollapse, onJumpToTerminal }: DetailViewProps) {
  const store = useAgentMonitorStore();

  // Get activities for this session from the store
  const activities = store.recentActivities.filter((a) => a.sessionId === session.id).slice(-50);

  const projectName = session.projectPath.split('/').pop() || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-80"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <AgentTypeIcon agentType={session.agentType} className={`w-4 h-4 ${AGENT_TYPE_COLORS[session.agentType]}`} />
            <span className="text-sm font-medium text-white">{AGENT_TYPE_NAMES[session.agentType]}</span>
          </button>
          <button
            onClick={onCollapse}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="text-gray-300">{projectName}</span>
          <span>•</span>
          <LaunchModeBadge launchMode={session.launchMode} />
          <span>•</span>
          <StatusBadge status={session.status} />
          <span>•</span>
          <span>{formatDuration(session.startedAt)}</span>
        </div>
      </div>

      {/* Activity feed - now using AI Elements conversation */}
      <div className="h-80">
        <AgentConversation
          activities={activities}
          emptyMessage="Waiting for activity..."
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-gray-500">
          <span>{session.messageCount ?? 0} messages</span>
          <span>{session.toolUseCount ?? 0} tool uses</span>
        </div>

        {/* Jump to Terminal button */}
        {session.terminalTabId && session.spaceId && onJumpToTerminal && (
          <button
            onClick={() =>
              session.terminalTabId &&
              session.spaceId &&
              onJumpToTerminal(session.terminalTabId, session.spaceId)
            }
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Jump to Terminal (⌘J)"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Terminal</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

function LaunchModeBadge({ launchMode }: { launchMode?: AgentSession['launchMode'] }) {
  const isMobile = launchMode === 'mobile';
  const Icon = isMobile ? Smartphone : Monitor;
  const label = isMobile ? 'Mobile' : 'Local';

  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300">
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: AgentSession['status'] }) {
  const config = {
    needs_input: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '❗ Needs Input' },
    active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '● Active' },
    idle: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '○ Idle' },
    ended: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '◌ Ended' },
  };

  const { bg, text, label } = config[status];

  return <span className={`px-1.5 py-0.5 rounded ${bg} ${text} ${status === 'needs_input' ? 'animate-pulse' : ''}`}>{label}</span>;
}

function formatDuration(startedAt: Date | string): string {
  const start = new Date(startedAt).getTime();
  const minutes = Math.floor((Date.now() - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
