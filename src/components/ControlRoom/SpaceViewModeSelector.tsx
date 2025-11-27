import { LayoutGrid, PanelLeft } from 'lucide-react';
import { useSpacesStore, spacesActions, type SpacesViewMode } from '@/stores/spaces.store';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const VIEW_MODES: { value: SpacesViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { value: 'cards', icon: LayoutGrid, label: 'Cards view' },
  { value: 'panes', icon: PanelLeft, label: 'Panes view' },
];

export function SpaceViewModeSelector() {
  const { viewMode } = useSpacesStore();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50">
        {VIEW_MODES.map(({ value, icon: Icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => spacesActions.setViewMode(value)}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  viewMode === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
