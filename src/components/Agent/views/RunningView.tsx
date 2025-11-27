import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Square, Maximize2 } from 'lucide-react';
import { agentStore, agentActions } from '@/stores/agent.store';
import { AgentAvatar } from '../AgentAvatar';
import { AgentActivityLogCompact } from '../AgentActivityLog';
import { useAgentDrawerContext } from '../AgentDrawerContext';
import { STATUS_LABELS, CostDisplay } from '../AgentDrawerUtils';
import {
  FamilyDrawerHeader,
  FamilyDrawerSecondaryButton,
  useFamilyDrawer,
} from '@/components/ui/family-drawer';

/**
 * View shown while agent is actively running a task
 */
export function RunningView() {
  const { setView } = useFamilyDrawer();
  const { tabId, onMaximize } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  // Redirect based on session state changes
  const sessionStatus = session?.status;
  useEffect(() => {
    if (!sessionStatus || sessionStatus === 'idle' || sessionStatus === 'stopped') {
      setView('default');
    } else if (sessionStatus === 'completed') {
      setView('completed');
    } else if (sessionStatus === 'error') {
      setView('error');
    }
  }, [sessionStatus, setView]);

  const handleStop = async () => {
    if (!session) return;
    await window.agent.stop(session.id);
    agentActions.updateStatus(session.id, 'stopped');
    setView('default');
  };

  // Guard for null session while useEffect redirects
  if (!session) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="px-1">
        <FamilyDrawerHeader
          icon={<AgentAvatar status={session.status} size="md" />}
          title={STATUS_LABELS[session.status]}
          description={session.currentFile || session.prompt?.slice(0, 50) + '...'}
        />

        {/* Activity log */}
        <div className="mt-6 border-t border-border pt-6">
          <div className="bg-black/40 rounded-xl p-3 max-h-40 overflow-hidden">
            {session.terminalLines.length > 0 ? (
              <AgentActivityLogCompact lines={session.terminalLines} maxLines={6} />
            ) : (
              <p className="text-xs text-muted-foreground italic">Waiting for activity...</p>
            )}
          </div>

          {/* Task summary with live cost */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Current task:</p>
              <CostDisplay costUSD={session.costUSD} compact />
            </div>
            <p className="text-sm">{session.prompt}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-7 flex gap-4">
        <FamilyDrawerSecondaryButton
          onClick={handleStop}
          className="bg-destructive/20 text-destructive hover:bg-destructive/30"
        >
          <Square className="w-4 h-4" /> Stop
        </FamilyDrawerSecondaryButton>
        {onMaximize && (
          <FamilyDrawerSecondaryButton
            onClick={onMaximize}
            className="bg-secondary text-secondary-foreground"
          >
            <Maximize2 className="w-4 h-4" /> Expand
          </FamilyDrawerSecondaryButton>
        )}
      </div>
    </div>
  );
}
