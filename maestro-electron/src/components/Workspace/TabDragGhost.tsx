import { type Tab } from '@/stores/workspace.store';
import { cn } from '@/lib/utils';

interface TabDragGhostProps {
  tab: Tab;
  variant: 'grid' | 'list';
}

export function TabDragGhost({ tab, variant }: TabDragGhostProps) {
  const getTabIcon = () => {
    switch (tab.type) {
      case 'terminal':
        return <span className="text-xl">{'>'}</span>;
      case 'browser':
        return <span className="text-xl">🌐</span>;
      case 'note':
        return <span className="text-xl">📝</span>;
      default:
        return <span className="text-xl">📄</span>;
    }
  };

  if (variant === 'grid') {
    // Grid style - icon only (48x48)
    return (
      <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center opacity-80 shadow-lg">
        {getTabIcon()}
      </div>
    );
  }

  // List style - full horizontal layout
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 min-w-[200px]',
      'bg-white/15 opacity-80 shadow-lg'
    )}>
      {/* Status Indicator */}
      {tab.status === 'running' && (
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      )}
      {tab.status === 'idle' && (
        <div className="w-2 h-2 rounded-full bg-gray-400" />
      )}

      {/* Title */}
      <span className="text-sm truncate flex-1">{tab.title}</span>
    </div>
  );
}
