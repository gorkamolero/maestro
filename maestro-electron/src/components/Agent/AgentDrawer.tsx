import { useState, createContext, useContext } from 'react';
import { useSnapshot } from 'valtio';
import { Play, Square, Eye, FolderOpen, ChevronRight, Maximize2, ArrowLeft, Bot } from 'lucide-react';
import { agentStore, agentActions, type AgentStatus, type PermissionMode } from '@/stores/agent.store';
import { cn } from '@/lib/utils';
import { AgentAvatar } from './AgentAvatar';
import { AgentActivityLogCompact } from './AgentActivityLog';
import {
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
  FamilyDrawerPortal,
  FamilyDrawerOverlay,
  FamilyDrawerContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerAnimatedContent,
  FamilyDrawerHeader,
  FamilyDrawerButton,
  FamilyDrawerSecondaryButton,
  FamilyDrawerViewContent,
  FamilyDrawerClose,
  useFamilyDrawer,
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
// Context for passing tab info to views
// ============================================================================

interface AgentDrawerContextValue {
  tabId: string;
  spaceId: string;
  defaultWorkDir?: string;
  onMaximize?: () => void;
}

const AgentDrawerContext = createContext<AgentDrawerContextValue | null>(null);

function useAgentDrawerContext() {
  const ctx = useContext(AgentDrawerContext);
  if (!ctx) throw new Error('Must be used within AgentDrawer');
  return ctx;
}

// ============================================================================
// Status Labels
// ============================================================================

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Ready to start',
  starting: 'Starting...',
  thinking: 'Thinking...',
  editing: 'Editing files...',
  'running-command': 'Running command...',
  waiting: 'Waiting...',
  completed: 'Completed',
  error: 'Error',
  stopped: 'Stopped',
};

// ============================================================================
// View: Default (Idle)
// ============================================================================

function DefaultView() {
  const { setView } = useFamilyDrawer();
  const { tabId } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find(s => s.tabId === tabId);

  // If there's an active session, redirect to running view
  if (session && ['starting', 'thinking', 'editing', 'running-command', 'waiting'].includes(session.status)) {
    // Use setTimeout to avoid setState during render
    setTimeout(() => setView('running'), 0);
    return null;
  }

  // If session completed or errored, show appropriate view
  if (session?.status === 'completed') {
    setTimeout(() => setView('completed'), 0);
    return null;
  }
  if (session?.status === 'error') {
    setTimeout(() => setView('error'), 0);
    return null;
  }

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

// ============================================================================
// View: Create Task
// ============================================================================

function CreateView() {
  const { setView } = useFamilyDrawer();
  const { tabId, spaceId, defaultWorkDir } = useAgentDrawerContext();

  const [prompt, setPrompt] = useState('');
  const [workDir, setWorkDir] = useState(defaultWorkDir || '');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('acceptEdits');

  const handleBrowse = async () => {
    const path = await window.electron?.invoke('dialog:openDirectory');
    if (path) setWorkDir(path);
  };

  const handleStart = async () => {
    if (!prompt.trim() || !workDir.trim()) return;

    const session = agentActions.createSession(
      tabId,
      spaceId,
      prompt,
      workDir,
      permissionMode
    );

    await window.agent.start({
      sessionId: session.id,
      workDir,
      prompt,
      permissionMode,
    });

    setView('running');
  };

  return (
    <div>
      <div className="px-1">
        <FamilyDrawerHeader
          icon={<Bot className="w-10 h-10 text-primary" />}
          title="New Task"
          description="What should Claude do?"
        />

        {/* Prompt input */}
        <div className="mt-6 space-y-4 border-t border-border pt-6">
          <div>
            <label className="text-[15px] font-semibold text-foreground">Task description</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want the agent to do..."
              className="mt-2 w-full h-24 px-3 py-2 text-sm bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Working directory */}
          <div>
            <label className="text-[15px] font-semibold text-foreground">Working directory</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={workDir}
                onChange={(e) => setWorkDir(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Permission mode */}
          <div>
            <label className="text-[15px] font-semibold text-foreground mb-2 block">Permission mode</label>
            <div className="space-y-2">
              {[
                { value: 'acceptEdits', label: 'Auto-approve', desc: 'Agent edits without asking' },
                { value: 'askUser', label: 'Ask first', desc: 'Confirm each edit' },
                { value: 'planOnly', label: 'Plan only', desc: 'Suggest but don\'t apply' },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setPermissionMode(mode.value as PermissionMode)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    permissionMode === mode.value
                      ? 'bg-primary/20 border border-primary/40'
                      : 'bg-muted/50 border border-transparent hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    permissionMode === mode.value ? 'border-primary' : 'border-muted-foreground'
                  )}>
                    {permissionMode === mode.value && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-7 flex gap-4">
        <FamilyDrawerSecondaryButton
          onClick={() => setView('default')}
          className="bg-secondary text-secondary-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </FamilyDrawerSecondaryButton>
        <FamilyDrawerSecondaryButton
          onClick={handleStart}
          className={cn(
            "bg-primary text-primary-foreground",
            (!prompt.trim() || !workDir.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Play className="w-4 h-4" /> Start
        </FamilyDrawerSecondaryButton>
      </div>
    </div>
  );
}

// ============================================================================
// View: Running
// ============================================================================

function RunningView() {
  const { setView } = useFamilyDrawer();
  const { tabId, onMaximize } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find(s => s.tabId === tabId);

  // Redirect if session state changed
  if (!session || session.status === 'idle' || session.status === 'stopped') {
    setTimeout(() => setView('default'), 0);
    return null;
  }
  if (session.status === 'completed') {
    setTimeout(() => setView('completed'), 0);
    return null;
  }
  if (session.status === 'error') {
    setTimeout(() => setView('error'), 0);
    return null;
  }

  const handleStop = async () => {
    await window.agent.stop(session.id);
    agentActions.updateStatus(session.id, 'stopped');
    setView('default');
  };

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
              <AgentActivityLogCompact
                lines={session.terminalLines}
                maxLines={6}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic">Waiting for activity...</p>
            )}
          </div>

          {/* Task summary */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Current task:</p>
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

// ============================================================================
// View: Completed
// ============================================================================

function CompletedView() {
  const { setView } = useFamilyDrawer();
  const { tabId, onMaximize } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find(s => s.tabId === tabId);

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
            {session?.costUSD && (
              <p className="mt-1 text-xs text-muted-foreground">
                Cost: ${session.costUSD.toFixed(4)}
              </p>
            )}
          </div>

          {/* Activity summary */}
          {session && session.terminalLines.length > 0 && (
            <div className="bg-black/40 rounded-xl p-3 max-h-32 overflow-hidden">
              <AgentActivityLogCompact
                lines={session.terminalLines.slice(-4)}
                maxLines={4}
              />
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

// ============================================================================
// View: Error
// ============================================================================

function ErrorView() {
  const { setView } = useFamilyDrawer();
  const { tabId } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find(s => s.tabId === tabId);

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
              <AgentActivityLogCompact
                lines={session.terminalLines.slice(-4)}
                maxLines={4}
              />
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

export function AgentDrawer({
  tabId,
  spaceId,
  children,
  defaultWorkDir,
  onMaximize,
}: AgentDrawerProps) {
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find(s => s.tabId === tabId);

  // Determine initial view based on session state
  const getInitialView = () => {
    if (!session) return 'default';
    if (['starting', 'thinking', 'editing', 'running-command', 'waiting'].includes(session.status)) {
      return 'running';
    }
    if (session.status === 'completed') return 'completed';
    if (session.status === 'error') return 'error';
    return 'default';
  };

  return (
    <AgentDrawerContext.Provider value={{ tabId, spaceId, defaultWorkDir, onMaximize }}>
      <FamilyDrawerRoot views={agentViews} defaultView={getInitialView()}>
        <FamilyDrawerTrigger asChild>
          {children}
        </FamilyDrawerTrigger>

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
