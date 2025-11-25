import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type TerminalStatusType = 'idle' | 'running' | 'success' | 'error';

interface TerminalStatusProps {
  tabId: string;
}

/**
 * Shows live terminal status indicator in the tab preview.
 * Phase 3 feature - subscribes to terminal events via IPC.
 */
export function TerminalStatus({ tabId }: TerminalStatusProps) {
  const [status] = useState<TerminalStatusType>('idle');

  useEffect(() => {
    // TODO: Subscribe to terminal events for this tab via IPC
    // For now, just show idle state
    // const [status, setStatus] = useState with IPC subscription
    // const unsubscribe = window.electron?.onTerminalStatus?.(tabId, setStatus);
    // return unsubscribe;
  }, [tabId]);

  return (
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        status === 'running' && 'bg-blue-400 animate-pulse',
        status === 'success' && 'bg-green-400',
        status === 'error' && 'bg-red-400',
        status === 'idle' && 'bg-foreground/20'
      )}
      title={`Terminal ${status}`}
    />
  );
}
