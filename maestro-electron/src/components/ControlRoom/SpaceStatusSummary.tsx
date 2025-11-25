import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

interface SpaceStatusSummaryProps {
  tabs: Tab[];
  className?: string;
}

export function SpaceStatusSummary({ tabs, className }: SpaceStatusSummaryProps) {
  if (tabs.length === 0) {
    return null;
  }

  const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
  const browserCount = tabs.filter((t) => t.type === 'browser').length;
  const appCount = tabs.filter((t) => t.type === 'app-launcher').length;

  const parts: string[] = [];
  if (terminalCount > 0) parts.push(`${terminalCount} term`);
  if (browserCount > 0) parts.push(`${browserCount} browser`);
  if (appCount > 0) parts.push(`${appCount} app`);

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {parts.join(' · ')}
    </p>
  );
}
