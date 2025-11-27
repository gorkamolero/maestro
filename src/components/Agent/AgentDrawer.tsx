import { useSnapshot } from 'valtio';
import { agentStore } from '@/stores/agent.store';
import { AgentDrawerContext } from './AgentDrawerContext';
import { ACTIVE_STATUSES } from './AgentDrawerUtils';
import { DefaultView, CreateView, RunningView, CompletedView, ErrorView } from './views';
import {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerPortal,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  FamilyDrawerViewContent,
  FamilyDrawerClose,
  type ViewsRegistry,
} from '@/components/ui/family-drawer';

// ============================================================================
// Types
// ============================================================================

interface AgentDrawerProps {
  tabId: string;
  spaceId: string;
  children: React.ReactNode;
  defaultWorkDir?: string;
  onMaximize?: () => void;
}

// ============================================================================
// Views Registry
// ============================================================================

const agentViews: ViewsRegistry = {
  default: DefaultView,
  create: CreateView,
  running: RunningView,
  completed: CompletedView,
  error: ErrorView,
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * AgentDrawer - A drawer component for managing Claude agent sessions
 *
 * Provides a multi-view interface for:
 * - Creating new agent tasks
 * - Monitoring running tasks
 * - Viewing completed/error states
 *
 * Uses FamilyDrawer for smooth view transitions and AgentDrawerContext
 * to share state across child views.
 */
export function AgentDrawer({
  tabId,
  spaceId,
  children,
  defaultWorkDir,
  onMaximize,
}: AgentDrawerProps) {
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  // Determine initial view based on session state
  const getInitialView = () => {
    if (!session) return 'default';
    if (ACTIVE_STATUSES.includes(session.status)) {
      return 'running';
    }
    if (session.status === 'completed') return 'completed';
    if (session.status === 'error') return 'error';
    return 'default';
  };

  return (
    <AgentDrawerContext.Provider value={{ tabId, spaceId, defaultWorkDir, onMaximize }}>
      <FamilyDrawerRoot views={agentViews} defaultView={getInitialView()}>
        <FamilyDrawerTrigger asChild>{children}</FamilyDrawerTrigger>

        <FamilyDrawerPortal>
          <FamilyDrawerOverlay className="bg-black/50" />
          <FamilyDrawerContent className="max-w-[400px] rounded-t-[24px] rounded-b-none bottom-0 inset-x-0 mx-auto bg-card border border-white/[0.08]">
            <FamilyDrawerClose />
            <FamilyDrawerAnimatedWrapper className="px-5 pb-8 pt-3">
              {/* Drag handle */}
              <div className="flex justify-center mb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <FamilyDrawerAnimatedContent>
                <FamilyDrawerViewContent />
              </FamilyDrawerAnimatedContent>
            </FamilyDrawerAnimatedWrapper>
          </FamilyDrawerContent>
        </FamilyDrawerPortal>
      </FamilyDrawerRoot>
    </AgentDrawerContext.Provider>
  );
}
