import { useState, useMemo } from 'react';
import { FolderOpen, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PermissionMode } from '@/stores/agent.store';
import { spacesActions } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: {
    prompt: string;
    workDir: string;
    permissionMode: PermissionMode;
  }) => void;
  defaultWorkDir?: string;
  spaceId?: string;
}

const PERMISSION_OPTIONS: {
  value: PermissionMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'acceptEdits',
    label: 'Auto-approve',
    description: 'Agent can edit files without asking',
  },
  {
    value: 'askUser',
    label: 'Ask first',
    description: 'Confirm before each file edit',
  },
  {
    value: 'planOnly',
    label: 'Plan only',
    description: "Agent suggests changes but doesn't apply",
  },
];

export function CreateAgentModal({
  open,
  onClose,
  onSubmit,
  defaultWorkDir = '',
  spaceId,
}: CreateAgentModalProps) {
  const [prompt, setPrompt] = useState('');
  const [workDir, setWorkDir] = useState(defaultWorkDir);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('askUser');
  const [prevOpen, setPrevOpen] = useState(false);

  // Compute recent paths synchronously during render
  const recentPaths = useMemo(() => {
    if (!spaceId) return [];
    return spacesActions.getRecentCodingPaths(spaceId);
  }, [spaceId]);

  // Initialize state when modal opens (during render, not in effect)
  if (open && !prevOpen) {
    setPrevOpen(true);
    // Auto-select most recent path if no default provided
    if (!defaultWorkDir && recentPaths.length > 0) {
      setWorkDir(recentPaths[0]);
    }
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const handleSubmit = () => {
    if (!prompt.trim() || !workDir.trim()) return;
    // Save the path to recent paths
    if (spaceId) {
      spacesActions.addRecentCodingPath(spaceId, workDir.trim());
    }
    onSubmit({ prompt: prompt.trim(), workDir: workDir.trim(), permissionMode });
    setPrompt('');
    onClose();
  };

  const handleBrowse = async () => {
    const result = await window.electron.invoke('dialog:openDirectory');
    if (result) {
      setWorkDir(result as string);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">New Agent Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4" onKeyDown={handleKeyDown}>
          {/* Prompt */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              What do you want the agent to do?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Refactor the authentication module to use refresh tokens..."
              className="w-full h-28 bg-background border border-white/[0.08] rounded-lg p-3 text-sm resize-none outline-none focus:border-white/20 transition-colors"
              autoFocus
            />
          </div>

          {/* Working directory */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Working directory
            </label>

            {/* Recent paths */}
            {recentPaths.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recentPaths.map((path) => {
                  const isSelected = workDir === path;
                  const displayName = path.split('/').pop() || path;
                  return (
                    <button
                      key={path}
                      onClick={() => setWorkDir(path)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors',
                        isSelected
                          ? 'bg-white/[0.12] text-foreground border border-white/[0.15]'
                          : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground'
                      )}
                      title={path}
                    >
                      <History className="w-3 h-3" />
                      {displayName}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={workDir}
                onChange={(e) => setWorkDir(e.target.value)}
                placeholder="~/projects/my-app"
                className="flex-1 bg-background border border-white/[0.08] rounded-lg px-3 py-2 text-sm outline-none focus:border-white/20 transition-colors"
              />
              <button
                onClick={handleBrowse}
                className="px-3 py-2 bg-white/[0.06] hover:bg-white/[0.10] rounded-lg transition-colors"
                title="Browse..."
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Permission mode */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Permission mode
            </label>
            <div className="space-y-2">
              {PERMISSION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    permissionMode === option.value
                      ? 'bg-white/[0.08] border border-white/[0.12]'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  )}
                >
                  <input
                    type="radio"
                    name="permissionMode"
                    value={option.value}
                    checked={permissionMode === option.value}
                    onChange={() => setPermissionMode(option.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || !workDir.trim()}
            className="px-4 py-2 bg-white/[0.10] hover:bg-white/[0.14] rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Task
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
