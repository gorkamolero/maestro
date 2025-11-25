import type { Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

interface SpaceStatusSummaryProps {
  tabs: Tab[];
  className?: string;
}

export function SpaceStatusSummary({ tabs, className }: SpaceStatusSummaryProps) {
  if (tabs.length === 0) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        No active tabs
      </div>
    );
  }

  // Count tabs by type
  const terminalCount = tabs.filter((t) => t.type === 'terminal').length;
  const browserCount = tabs.filter((t) => t.type === 'browser').length;
  const appCount = tabs.filter((t) => t.type === 'app-launcher').length;

  // Get app names for display
  const appNames = tabs
    .filter((t) => t.type === 'app-launcher')
    .map((t) => t.title)
    .slice(0, 3);

  const lines: string[] = [];

  if (terminalCount > 0) {
    lines.push(`Terminal: ${terminalCount} ${terminalCount === 1 ? 'tab' : 'tabs'}`);
  }
  if (browserCount > 0) {
    lines.push(`Browser: ${browserCount} ${browserCount === 1 ? 'tab' : 'tabs'}`);
  }
  if (appCount > 0) {
    const appDisplay = appNames.length > 0 ? appNames.join(', ') : `${appCount} apps`;
    lines.push(`Apps: ${appDisplay}`);
  }

  return (
    <div className={cn('text-xs text-muted-foreground space-y-0.5', className)}>
      {lines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}
