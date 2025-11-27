import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { Play } from 'lucide-react';
import { agentStore } from '@/stores/agent.store';
import { AgentAvatar } from '../AgentAvatar';
import { useAgentDrawerContext } from '../AgentDrawerContext';
import { ACTIVE_STATUSES } from '../AgentDrawerUtils';
import { FamilyDrawerButton, useFamilyDrawer } from '@/components/ui/family-drawer';

/**
 * Default view shown when agent is idle/ready
 */
export function DefaultView() {
  const { setView } = useFamilyDrawer();
  const { tabId } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  // Redirect to appropriate view based on session status
  const sessionStatus = session?.status;
  useEffect(() => {
    if (!sessionStatus) return;

    if (ACTIVE_STATUSES.includes(sessionStatus)) {
      setView('running');
    } else if (sessionStatus === 'completed') {
      setView('completed');
    } else if (sessionStatus === 'error') {
      setView('error');
    }
  }, [sessionStatus, setView]);

  return (
    <>
      <header className="mb-4 flex h-[72px] items-center gap-3 border-b border-border">
        <AgentAvatar status="idle" size="sm" />
        <div>
          <h2 className="text-[17px] font-semibold text-foreground">Claude Agent</h2>
          <p className="text-sm text-muted-foreground">Ready to help</p>
        </div>
      </header>

      <div className="space-y-3">
        <FamilyDrawerButton onClick={() => setView('create')}>
          <Play className="w-4 h-4" />
          Start New Task
        </FamilyDrawerButton>
      </div>

      {/* Recent task hint */}
      {session?.prompt && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Last task:</p>
          <p className="text-sm truncate">{session.prompt}</p>
        </div>
      )}
    </>
  );
}
