import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { Play, Square, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { agentStore, agentActions, type AgentStatus, type PermissionMode } from '@/stores/agent.store';
import { notificationsActions } from '@/stores/notifications.store';
import type { Tab } from '@/stores/workspace.store';
import { AgentAvatar } from './AgentAvatar';
import { AgentActivityLog } from './AgentActivityLog';
import { CreateAgentModal } from './CreateAgentModal';

interface AgentPanelProps {
  tab: Tab;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Ready to start',
  starting: 'Starting agent...',
  thinking: 'Thinking...',
  editing: 'Editing files...',
  'running-command': 'Running command...',
  waiting: 'Waiting for input...',
  completed: 'Task completed',
  error: 'Error occurred',
  stopped: 'Stopped',
};

export function AgentPanel({ tab }: AgentPanelProps) {
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tab.id);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Subscribe to SDK notification events (warnings, errors, info from hooks)
  // Note: Status and terminal line subscriptions are handled globally in App.tsx
  useEffect(() => {
    if (!session) return;

    const unsubNotification = window.agent.onNotification((data) => {
      if (data.sessionId === session.id) {
        notificationsActions.add({
          spaceId: session.spaceId,
          tabId: session.tabId,
          type: data.type === 'error' ? 'agent-error' : 'agent-info',
          title: data.title,
          message: data.message,
        });
      }
    });

    return () => {
      unsubNotification();
    };
  }, [session]);

  // Trigger notifications and toasts on completion/error
  useEffect(() => {
    if (session?.status === 'completed') {
      notificationsActions.add({
        spaceId: session.spaceId,
        tabId: session.tabId,
        type: 'agent-done',
        message: 'Agent completed task',
      });
      toast.success('Agent completed task');
    } else if (session?.status === 'error') {
      const errorMessage = session.error || 'Agent encountered an error';
      notificationsActions.add({
        spaceId: session.spaceId,
        tabId: session.tabId,
        type: 'agent-error',
        message: errorMessage,
      });
      // Show toast with the error - important for billing/API errors
      toast.error('Agent Error', {
        description: errorMessage,
        duration: 10000, // Show longer for errors
      });
    }
  }, [session?.status, session?.spaceId, session?.tabId, session?.error]);

  const handleStart = async (config: {
    prompt: string;
    workDir: string;
    permissionMode: PermissionMode;
  }) => {
    const newSession = agentActions.createSession(
      tab.id,
      tab.spaceId,
      config.prompt,
      config.workDir,
      config.permissionMode
    );

    await window.agent.start({
      sessionId: newSession.id,
      workDir: config.workDir,
      prompt: config.prompt,
      permissionMode: config.permissionMode,
    });
  };

  const handleStop = async () => {
    if (session) {
      await window.agent.stop(session.id);
      agentActions.updateStatus(session.id, 'stopped');
    }
  };

  const handleNewTask = () => {
    if (session) {
      agentActions.clearSession(session.id);
    }
    setShowCreateModal(true);
  };

  const isRunning =
    session &&
    ['starting', 'thinking', 'editing', 'running-command', 'waiting'].includes(session.status);
  const isFinished =
    session && ['completed', 'error', 'stopped'].includes(session.status);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Left: Avatar and status */}
        <div className="w-1/3 flex flex-col items-center justify-center p-8 border-r border-white/[0.04]">
          <AgentAvatar status={session?.status || 'idle'} size="lg" />

          <p className="mt-6 text-sm text-muted-foreground">
            {STATUS_LABELS[session?.status || 'idle']}
          </p>

          {session?.currentFile && (
            <p className="mt-2 text-xs text-muted-foreground/70 font-mono truncate max-w-full px-4">
              {session.currentFile}
            </p>
          )}
        </div>

        {/* Right: Activity log */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Activity</h3>
          </div>

          <div className="flex-1 bg-black/50 rounded-lg p-3 overflow-hidden">
            {session?.terminalLines.length ? (
              <AgentActivityLog
                lines={session.terminalLines}
                className="h-full"
              />
            ) : (
              <p className="text-gray-500 text-xs italic">
                {session ? 'Waiting for activity...' : 'Start a task to see activity'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Prompt and controls */}
      <div className="border-t border-white/[0.04] p-4">
        {session?.prompt && (
          <div className="mb-4 p-3 bg-white/[0.02] rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Current task:</p>
            <p className="text-sm">{session.prompt}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!session ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Task
            </button>
          ) : isFinished ? (
            <button
              onClick={handleNewTask}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              New Task
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}

          {isFinished && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg text-sm transition-colors">
              <Eye className="w-4 h-4" />
              View Changes
            </button>
          )}

          {session?.costUSD && (
            <span className="ml-auto text-xs text-muted-foreground">
              Cost: ${session.costUSD.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Create modal */}
      <CreateAgentModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleStart}
        defaultWorkDir={tab.agentConfig?.workDir}
        spaceId={tab.spaceId}
      />
    </div>
  );
}
