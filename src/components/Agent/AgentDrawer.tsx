import { useState, useEffect, createContext, useContext } from 'react';
import { useSnapshot } from 'valtio';
import {
  Play,
  Square,
  Eye,
  FolderOpen,
  ChevronRight,
  Maximize2,
  ArrowLeft,
  Bot,
  Coins,
} from 'lucide-react';
import {
  agentStore,
  agentActions,
  type AgentStatus,
  type PermissionMode,
  type AgentUsage,
} from '@/stores/agent.store';
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
// Cost Display Component
// ============================================================================

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface CostDisplayProps {
  costUSD?: number;
  usage?: AgentUsage;
  compact?: boolean;
}

function CostDisplay({ costUSD, usage, compact = false }: CostDisplayProps) {
  if (!costUSD && !usage) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Coins className="w-3 h-3" />
        {costUSD !== undefined ? `$${costUSD.toFixed(4)}` : '...'}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total Cost</span>
        <span className="text-sm font-medium">
          {costUSD !== undefined ? `$${costUSD.toFixed(4)}` : '—'}
        </span>
      </div>
      {usage && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Input tokens</span>
            <span className="text-xs font-mono">{formatTokens(usage.input_tokens)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Output tokens</span>
            <span className="text-xs font-mono">{formatTokens(usage.output_tokens)}</span>
          </div>
          {usage.cache_read_input_tokens !== undefined && usage.cache_read_input_tokens > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Cache hits</span>
              <span className="text-xs font-mono text-green-400">
                {formatTokens(usage.cache_read_input_tokens)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// View: Default (Idle)
// ============================================================================

function DefaultView() {
  const { setView } = useFamilyDrawer();
  const { tabId } = useAgentDrawerContext();
  const { sessions } = useSnapshot(agentStore);
  const session = sessions.find((s) => s.tabId === tabId);

  // Redirect to appropriate view based on session status
  const sessionStatus = session?.status;
  useEffect(() => {
    if (!sessionStatus) return;

    const activeStatuses = ['starting', 'thinking', 'editing', 'running-command', 'waiting'];
    if (activeStatuses.includes(sessionStatus)) {
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

// ============================================================================
// View: Create Task
// ============================================================================

// Available tools that can be restricted
const AVAILABLE_TOOLS = [
  { name: 'Read', desc: 'Read files' },
  { name: 'Write', desc: 'Create files' },
  { name: 'Edit', desc: 'Edit files' },
  { name: 'Bash', desc: 'Run commands' },
  { name: 'Glob', desc: 'Search files' },
  { name: 'Grep', desc: 'Search content' },
  { name: 'Task', desc: 'Spawn agents' },
  { name: 'WebFetch', desc: 'Fetch URLs' },
  { name: 'WebSearch', desc: 'Search web' },
];

function CreateView() {
  const { setView } = useFamilyDrawer();
  const { tabId, spaceId, defaultWorkDir } = useAgentDrawerContext();

  const [prompt, setPrompt] = useState('');
  const [workDir, setWorkDir] = useState(defaultWorkDir || '');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('acceptEdits');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [useWorktree, setUseWorktree] = useState(false);

  const handleBrowse = async () => {
    const path = await window.electron?.invoke('dialog:openDirectory');
    if (path) setWorkDir(path);
  };

  const toggleTool = (toolName: string) => {
    setAllowedTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  const handleStart = async () => {
    if (!prompt.trim() || !workDir.trim()) return;

    const session = agentActions.createSession(tabId, spaceId, prompt, workDir, permissionMode);

    await window.agent.start({
      sessionId: session.id,
      workDir,
      prompt,
      permissionMode,
      // Only pass allowedTools if user has restricted them
      allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
      useWorktree,
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
            <label className="text-[15px] font-semibold text-foreground mb-2 block">
              Permission mode
            </label>
            <div className="space-y-2">
              {[
                { value: 'acceptEdits', label: 'Auto-approve', desc: 'Agent edits without asking' },
                { value: 'askUser', label: 'Ask first', desc: 'Confirm each edit' },
                { value: 'planOnly', label: 'Plan only', desc: "Suggest but don't apply" },
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
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                      permissionMode === mode.value ? 'border-primary' : 'border-muted-foreground'
                    )}
                  >
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

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Advanced options</span>
            <ChevronRight
              className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-90')}
            />
          </button>

          {/* Advanced options */}
          {showAdvanced && (
            <div className="space-y-4">
              {/* Git worktree isolation */}
              <div>
                <button
                  onClick={() => setUseWorktree(!useWorktree)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors bg-muted/30 hover:bg-muted/50"
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                      useWorktree ? 'border-primary bg-primary' : 'border-muted-foreground'
                    )}
                  >
                    {useWorktree && (
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Use git worktree</p>
                    <p className="text-xs text-muted-foreground">
                      Isolate session in separate branch
                    </p>
                  </div>
                </button>
              </div>

              {/* Allowed tools */}
              <div className="space-y-2">
                <label className="text-[15px] font-semibold text-foreground block">
                  Allowed tools
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {allowedTools.length === 0
                      ? '(all enabled)'
                      : `(${allowedTools.length} selected)`}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Restrict which tools the agent can use. Leave empty to allow all.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_TOOLS.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => toggleTool(tool.name)}
                      className={cn(
                        'px-2 py-1.5 text-xs rounded-md border transition-colors',
                        allowedTools.includes(tool.name)
                          ? 'bg-primary/20 border-primary/40 text-foreground'
                          : allowedTools.length === 0
                            ? 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                            : 'bg-muted/10 border-transparent text-muted-foreground/50 hover:bg-muted/30'
                      )}
                      title={tool.desc}
                    >
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            'bg-primary text-primary-foreground',
            (!prompt.trim() || !workDir.trim()) && 'opacity-50 cursor-not-allowed'
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

// ============================================================================
// View: Completed
// ============================================================================

function CompletedView() {
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

// ============================================================================
// View: Error
// ============================================================================

function ErrorView() {
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
  const session = sessions.find((s) => s.tabId === tabId);

  // Determine initial view based on session state
  const getInitialView = () => {
    if (!session) return 'default';
    if (
      ['starting', 'thinking', 'editing', 'running-command', 'waiting'].includes(session.status)
    ) {
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
