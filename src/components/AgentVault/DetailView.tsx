// DetailView - Single agent activity feed

import { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Minus } from 'lucide-react';
import { useAgentMonitorStore } from '@/stores/agent-monitor.store';
import type { AgentSession, AgentActivity } from '@/types/agent-events';

interface DetailViewProps {
  session: AgentSession;
  onBack: () => void;
  onCollapse: () => void;
}

export function DetailView({ session, onBack, onCollapse }: DetailViewProps) {
  const store = useAgentMonitorStore();
  const feedRef = useRef<HTMLDivElement>(null);

  // Get activities for this session from the store
  const activities = store.recentActivities.filter((a) => a.sessionId === session.id).slice(-50);

  // Auto-scroll on new activity
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [activities.length]);

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
            <span className="text-sm font-medium text-white">Claude Code</span>
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
          <StatusBadge status={session.status} />
          <span>•</span>
          <span>{formatDuration(session.startedAt)}</span>
        </div>
      </div>

      {/* Activity feed */}
      <div ref={feedRef} className="h-72 overflow-y-auto p-2 space-y-0.5">
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">Waiting for activity...</div>
        ) : (
          activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
        <span>{session.messageCount ?? 0} messages</span>
        <span>{session.toolUseCount ?? 0} tool uses</span>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: AgentSession['status'] }) {
  const config = {
    active: { bg: 'bg-green-500/20', text: 'text-green-400', label: '● Active' },
    idle: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '○ Idle' },
    ended: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '◌ Ended' },
  };

  const { bg, text, label } = config[status];

  return <span className={`px-1.5 py-0.5 rounded ${bg} ${text}`}>{label}</span>;
}

function ActivityRow({ activity }: { activity: AgentActivity }) {
  const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const icons: Record<string, string> = {
    user_prompt: '💬',
    assistant_message: '🤖',
    assistant_thinking: '🤔',
    tool_use: '🔧',
    tool_result: '✓',
    error: '✗',
    session_start: '▶',
    session_end: '⏹',
  };

  // Generate summary based on activity type
  const getSummary = (): string => {
    switch (activity.type) {
      case 'tool_use':
        return activity.summary;
      case 'user_prompt':
        return activity.content.slice(0, 60) + (activity.content.length > 60 ? '...' : '');
      case 'assistant_message':
        return activity.content.slice(0, 60) + (activity.content.length > 60 ? '...' : '');
      case 'assistant_thinking':
        return activity.content.slice(0, 60) + (activity.content.length > 60 ? '...' : '');
      case 'tool_result':
        return activity.success ? (activity.output?.slice(0, 40) || 'Success') : (activity.error?.slice(0, 40) || 'Error');
      case 'error':
        return activity.message;
      case 'session_start':
        return `Started in ${activity.projectPath.split('/').pop()}`;
      case 'session_end':
        return `Session ended (${activity.reason || 'unknown'})`;
      default:
        return activity.type;
    }
  };

  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors">
      <span className="text-xs text-gray-500 w-10 flex-shrink-0 pt-0.5">{time}</span>
      <span className="text-sm">{icons[activity.type] || '•'}</span>
      <span className="text-xs text-gray-300 flex-1 truncate">{getSummary()}</span>
    </div>
  );
}

function formatDuration(startedAt: Date | string): string {
  const start = new Date(startedAt).getTime();
  const minutes = Math.floor((Date.now() - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
