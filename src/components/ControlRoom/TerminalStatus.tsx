import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

interface TerminalStatusProps {
  tabId: string;
}

/**
 * Shows live terminal/agent status indicator in the tab preview.
 * Reads from workspace store tab status.
 */
export function TerminalStatus({ tabId }: TerminalStatusProps) {
  const { tabs } = useWorkspaceStore();
  const tab = tabs.find((t) => t.id === tabId);
  const status = tab?.status || 'idle';

  // Don't show anything for idle status - keeps UI clean
  if (status === 'idle') {
    return null;
  }

  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full shrink-0 ring-1 ring-background',
        status === 'running' && 'bg-blue-400 animate-pulse',
        status === 'active' && 'bg-green-400'
      )}
      title={`${tab?.type || 'Tab'} ${status}`}
    />
  );
}
