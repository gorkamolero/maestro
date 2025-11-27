import { useSnapshot } from 'valtio';
import { ChevronRight } from 'lucide-react';
import { agentStore, agentActions } from '@/stores/agent.store';
import { AgentAvatar } from '../AgentAvatar';
import { AgentActivityLogCompact } from '../AgentActivityLog';
import { useAgentDrawerContext } from '../AgentDrawerContext';
import {
  FamilyDrawerHeader,
  FamilyDrawerSecondaryButton,
  useFamilyDrawer,
} from '@/components/ui/family-drawer';

/**
 * View shown when agent encounters an error during execution
 */
export function ErrorView() {
  const { setView } = useFamilyDrawer();
  const { tabId } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  const handleRetry = () => {
    setView('create');
  };

  const handleDismiss = () => {
    if (session) {
      agentActions.clearSession(session.id);
    }
    setView('default');
  };

  return (
    <div>
      <div className="px-1">
        <FamilyDrawerHeader
          icon={<AgentAvatar status="error" size="md" />}
          title="Task Failed"
          description="An error occurred during execution"
        />

        <div className="mt-6 space-y-4 border-t border-border pt-6">
          {/* Error details */}
          <div className="rounded-lg bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">Error</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {session?.error || 'An unexpected error occurred'}
            </p>
          </div>

          {/* Activity log showing what happened */}
          {session && session.terminalLines.length > 0 && (
            <div className="bg-black/40 rounded-xl p-3 max-h-32 overflow-hidden">
              <AgentActivityLogCompact lines={session.terminalLines.slice(-4)} maxLines={4} />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-7 flex gap-4">
        <FamilyDrawerSecondaryButton
          onClick={handleDismiss}
          className="bg-secondary text-secondary-foreground"
        >
          Dismiss
        </FamilyDrawerSecondaryButton>
        <FamilyDrawerSecondaryButton
          onClick={handleRetry}
          className="bg-primary text-primary-foreground"
        >
          <ChevronRight className="w-4 h-4" /> Try Again
        </FamilyDrawerSecondaryButton>
      </div>
    </div>
  );
}
