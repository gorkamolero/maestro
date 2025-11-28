import { useState } from 'react';
import { XTermWrapper } from './XTermWrapper';
import { TerminalHeader } from './TerminalHeader';
import type { TerminalTheme } from './XTermWrapper';
import type { TerminalState } from './terminal.utils';

interface TerminalPanelProps {
  segmentId: string;
  initialState?: TerminalState;
  /** Initial working directory */
  cwd?: string;
  /** Initial command to run after shell spawns */
  initialCommand?: string;
  onStateChange?: (state: TerminalState) => void;
}

export function TerminalPanel({ segmentId, initialState, cwd, initialCommand, onStateChange }: TerminalPanelProps) {
  const [theme, setTheme] = useState<TerminalTheme>(initialState?.theme || 'termius-dark');
  const [workingDir, setWorkingDir] = useState<string | null>(initialState?.workingDir || null);

  return (
    <div
      className="terminal-panel flex flex-col h-full w-full rounded-lg overflow-hidden shadow-2xl"
      style={{
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <TerminalHeader workingDir={workingDir} theme={theme} onThemeChange={setTheme} />

      <div className="flex-1 overflow-hidden">
        <XTermWrapper
          segmentId={segmentId}
          theme={theme}
          cwd={cwd || initialState?.cwd}
          initialCommand={initialCommand || initialState?.initialCommand}
          initialState={initialState}
          onStateChange={(state) => {
            if (state.workingDir) {
              setWorkingDir(state.workingDir);
            }
            onStateChange?.(state);
          }}
        />
      </div>
    </div>
  );
}
