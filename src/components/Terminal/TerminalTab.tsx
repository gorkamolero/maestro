import { useCallback } from 'react';
import { XTermWrapper, type TerminalTheme } from './XTermWrapper';
import type { TerminalState } from './terminal.utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TerminalTabData {
  id: string;
  title: string;
  workingDir: string | null;
  isActive: boolean;
}

interface TerminalTabProps {
  tab: TerminalTabData;
  segmentId: string;
  theme: TerminalTheme;
  initialState?: TerminalState;
  isActive: boolean;
  onClose: () => void;
  onStateChange?: (state: TerminalState) => void;
  onTitleChange?: (title: string) => void;
}

export function TerminalTab({
  tab,
  segmentId,
  theme,
  initialState,
  isActive,
  onClose,
  onStateChange,
  onTitleChange,
}: TerminalTabProps) {
  const handleStateChange = useCallback(
    (state: TerminalState) => {
      // Update tab title if working directory changed
      if (state.workingDir && state.workingDir !== tab.workingDir) {
        const dirName = state.workingDir.split('/').pop() || 'Terminal';
        onTitleChange?.(dirName);
      }

      onStateChange?.(state);
    },
    [tab.workingDir, onStateChange, onTitleChange]
  );

  return (
    <div
      className={`terminal-tab h-full w-full ${isActive ? 'block' : 'hidden'}`}
      role="tabpanel"
      aria-labelledby={`terminal-tab-${tab.id}`}
    >
      <XTermWrapper
        segmentId={`${segmentId}-${tab.id}`}
        initialState={initialState}
        theme={theme}
        onStateChange={handleStateChange}
      />
    </div>
  );
}
