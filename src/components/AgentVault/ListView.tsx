// ListView - Expanded list of all agents

import { motion } from 'motion/react';
import { Minus, ChevronRight, Monitor, Smartphone, ExternalLink } from 'lucide-react';
import type { AgentSession } from '@/types/agent-events';
import { AgentTypeIcon, AGENT_TYPE_COLORS } from './AgentIcons';

interface ListViewProps {
  sessions: AgentSession[];
  onCollapse: () => void;
  onSelectAgent: (sessionId: string) => void;
  onJumpToTerminal?: (tabId: string, spaceId: string) => void;
}

export function ListView({ sessions, onCollapse, onSelectAgent, onJumpToTerminal }: ListViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-72"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-white">Agents</h3>
        <button
          onClick={onCollapse}
          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Agent list */}
      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">No active agents</div>
        ) : (
          sessions.map((session) => (
            <AgentListItem
              key={session.id}
              session={session}
              onClick={() => onSelectAgent(session.id)}
              onJumpToTerminal={onJumpToTerminal}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

interface AgentListItemProps {
  session: AgentSession;
  onClick: () => void;
  onJumpToTerminal?: (tabId: string, spaceId: string) => void;
}

function AgentListItem({ session, onClick, onJumpToTerminal }: AgentListItemProps) {
  const projectName = session.projectPath.split('/').pop() || 'Unknown';

  const statusConfig = {
    needs_input: { dot: 'bg-orange-500 animate-pulse', text: 'text-orange-400' },
    active: { dot: 'bg-green-500', text: 'text-green-400' },
    idle: { dot: 'bg-yellow-500', text: 'text-yellow-400' },
    ended: { dot: 'bg-gray-500', text: 'text-gray-400' },
  };

  const config = statusConfig[session.status];

  // Get last activity summary
  const activityText =
    session.toolUseCount > 0
      ? `${session.toolUseCount} tools used`
      : session.status === 'idle'
        ? 'Idle'
        : 'Starting...';

  // Launch mode badge
  const LaunchModeIcon = session.launchMode === 'mobile' ? Smartphone : Monitor;
  const launchModeTitle = session.launchMode === 'mobile' ? 'Mobile (Happy Coder)' : 'Local';

  // Can jump to terminal?
  const canJump = session.terminalTabId && session.spaceId && onJumpToTerminal;

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canJump) {
      onJumpToTerminal(session.terminalTabId!, session.spaceId!);
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full p-3 rounded-xl hover:bg-gray-800/70 transition-colors text-left group"
    >
      <div className="flex items-center gap-3">
        <AgentTypeIcon agentType={session.agentType} className={`w-5 h-5 ${AGENT_TYPE_COLORS[session.agentType]}`} />
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white font-medium truncate">{projectName}</span>
            <LaunchModeIcon className="w-3.5 h-3.5 text-gray-500" title={launchModeTitle} />
          </div>
          <div className="text-xs text-gray-400 truncate">{activityText}</div>
        </div>
        {canJump ? (
          <button
            onClick={handleJump}
            className="p-1 rounded hover:bg-gray-700 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Jump to Terminal"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
        )}
      </div>
    </button>
  );
}
