import { CheckSquare, FileText } from 'lucide-react';
import { spacesActions } from '@/stores/spaces.store';
import type { SpaceContentMode } from '@/types';
import { cn } from '@/lib/utils';

interface SpaceContentModeSelectorProps {
  spaceId: string;
  mode: SpaceContentMode;
}

const MODES: { value: SpaceContentMode; icon: typeof CheckSquare; label: string }[] = [
  { value: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { value: 'notes', icon: FileText, label: 'Notes' },
];

export function SpaceContentModeSelector({ spaceId, mode }: SpaceContentModeSelectorProps) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded bg-black/20 border border-white/[0.04]">
      {MODES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={(e) => {
            e.stopPropagation();
            spacesActions.setSpaceContentMode(spaceId, value);
          }}
          className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all',
            mode === value
              ? 'bg-white/10 text-foreground/90 shadow-sm'
              : 'text-muted-foreground/70 hover:text-foreground/80 hover:bg-white/5'
          )}
        >
          <Icon className="w-2.5 h-2.5" />
          <span className="tracking-wide uppercase">{label}</span>
        </button>
      ))}
    </div>
  );
}
