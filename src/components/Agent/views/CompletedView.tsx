import { useSnapshot } from 'valtio';
import { Play, Eye } from 'lucide-react';
import { agentStore, agentActions } from '@/stores/agent.store';
import { AgentAvatar } from '../AgentAvatar';
import { AgentActivityLogCompact } from '../AgentActivityLog';
import { useAgentDrawerContext } from '../AgentDrawerContext';
import { CostDisplay } from '../AgentDrawerUtils';
import {
  FamilyDrawerHeader,
  FamilyDrawerSecondaryButton,
  useFamilyDrawer,
} from '@/components/ui/family-drawer';

/**
 * View shown when agent has completed a task successfully
 */
export function CompletedView() {
  const { setView } = useFamilyDrawer();
  const { tabId, onMaximize } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  const handleNewTask = () => {
    if (session) {
      agentActions.clearSession(session.id);
    }
    setView('create');
  };

  return (
    <div>
      <div className="px-1">
        <FamilyDrawerHeader
          icon={<AgentAvatar status="completed" size="md" />}
          title="Task Completed"
          description={session?.prompt?.slice(0, 50) + '...'}
        />

        <div className="mt-6 space-y-4 border-t border-border pt-6">
          {/* Success summary */}
          <div className="rounded-lg bg-green-500/10 p-4">
            <p className="text-sm font-medium text-green-400">Task completed successfully</p>
          </div>

          {/* Cost & usage breakdown */}
          {session && (session.costUSD !== undefined || session.usage) && (
            <CostDisplay costUSD={session.costUSD} usage={session.usage} />
          )}

          {/* Activity summary */}
          {session && session.terminalLines.length > 0 && (
            <div className="bg-black/40 rounded-xl p-3 max-h-32 overflow-hidden">
              <AgentActivityLogCompact lines={session.terminalLines.slice(-4)} maxLines={4} />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-7 flex gap-4">
        {onMaximize && (
          <FamilyDrawerSecondaryButton
            onClick={onMaximize}
            className="bg-secondary text-secondary-foreground"
          >
            <Eye className="w-4 h-4" /> View Details
          </FamilyDrawerSecondaryButton>
        )}
        <FamilyDrawerSecondaryButton
          onClick={handleNewTask}
          className="bg-primary text-primary-foreground"
        >
          <Play className="w-4 h-4" /> New Task
        </FamilyDrawerSecondaryButton>
      </div>
    </div>
  );
}
