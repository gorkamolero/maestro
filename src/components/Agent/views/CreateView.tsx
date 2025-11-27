import { useState } from 'react';
import { Play, FolderOpen, ChevronRight, ArrowLeft, Bot } from 'lucide-react';
import { agentActions, type PermissionMode } from '@/stores/agent.store';
import { cn } from '@/lib/utils';
import { useAgentDrawerContext } from '../AgentDrawerContext';
import { AVAILABLE_TOOLS } from '../AgentDrawerUtils';
import {
  FamilyDrawerHeader,
  FamilyDrawerSecondaryButton,
  useFamilyDrawer,
} from '@/components/ui/family-drawer';

// ============================================================================
// Permission Mode Options
// ============================================================================

const PERMISSION_MODES = [
  { value: 'acceptEdits', label: 'Auto-approve', desc: 'Agent edits without asking' },
  { value: 'askUser', label: 'Ask first', desc: 'Confirm each edit' },
  { value: 'planOnly', label: 'Plan only', desc: "Suggest but don't apply" },
] as const;

// ============================================================================
// Sub-components
// ============================================================================

interface PermissionModeSelectorProps {
  value: PermissionMode;
  onChange: (mode: PermissionMode) => void;
}

function PermissionModeSelector({ value, onChange }: PermissionModeSelectorProps) {
  return (
    <div>
      <label className="text-[15px] font-semibold text-foreground mb-2 block">
        Permission mode
      </label>
      <div className="space-y-2">
        {PERMISSION_MODES.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value as PermissionMode)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
              value === mode.value
                ? 'bg-primary/20 border border-primary/40'
                : 'bg-muted/50 border border-transparent hover:bg-muted'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                value === mode.value ? 'border-primary' : 'border-muted-foreground'
              )}
            >
              {value === mode.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium">{mode.label}</p>
              <p className="text-xs text-muted-foreground">{mode.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface ToolSelectorProps {
  allowedTools: string[];
  onToggle: (toolName: string) => void;
}

function ToolSelector({ allowedTools, onToggle }: ToolSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-[15px] font-semibold text-foreground block">
        Allowed tools
        <span className="text-xs font-normal text-muted-foreground ml-2">
          {allowedTools.length === 0 ? '(all enabled)' : `(${allowedTools.length} selected)`}
        </span>
      </label>
      <p className="text-xs text-muted-foreground mb-2">
        Restrict which tools the agent can use. Leave empty to allow all.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {AVAILABLE_TOOLS.map((tool) => (
          <button
            key={tool.name}
            onClick={() => onToggle(tool.name)}
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
  );
}

interface WorktreeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function WorktreeToggle({ checked, onChange }: WorktreeToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors bg-muted/30 hover:bg-muted/50"
    >
      <div
        className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
          checked ? 'border-primary bg-primary' : 'border-muted-foreground'
        )}
      >
        {checked && (
          <svg
            className="w-3 h-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">Use git worktree</p>
        <p className="text-xs text-muted-foreground">Isolate session in separate branch</p>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * View for creating a new agent task
 */
export function CreateView() {
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

  const canStart = prompt.trim() && workDir.trim();

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
          <PermissionModeSelector value={permissionMode} onChange={setPermissionMode} />

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
              <WorktreeToggle checked={useWorktree} onChange={setUseWorktree} />
              <ToolSelector allowedTools={allowedTools} onToggle={toggleTool} />
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
            !canStart && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Play className="w-4 h-4" /> Start
        </FamilyDrawerSecondaryButton>
      </div>
    </div>
  );
}
