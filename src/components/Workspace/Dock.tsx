import { useSnapshot } from 'valtio';
import { tracksStore, tracksActions } from '@/stores/tracks.store';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Plus, Home, Music, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dock as DockPrimitive, DockIcon } from '@/components/ui/dock';
import { GlowEffect } from '@/components/motion-primitives/glow-effect';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const TRACK_ICONS: Record<string, any> = {
  home: Home,
  music: Music,
  science: FlaskConical,
};

export function Dock() {
  const { tracks } = useSnapshot(tracksStore);
  const { activeTrackId } = useSnapshot(workspaceStore);

  const handleAddTrack = () => {
    const trackNumber = Math.floor(Math.random() * 1000);
    const newTrack = tracksActions.addTrack(`Track ${trackNumber}`);
    workspaceActions.switchTrack(newTrack.id);
  };

  return (
    <div className="relative">
      <TooltipProvider delayDuration={0}>
        <DockPrimitive
          className="bg-background/80 backdrop-blur-xl border-border shadow-2xl"
          iconSize={48}
          iconMagnification={64}
          iconDistance={120}
        >
          {/* Track icons */}
          {tracks.map((track) => {
            const Icon = TRACK_ICONS[track.icon || 'home'] || Home;
            const isActive = activeTrackId === track.id;
            const hasActiveSegments = track.segments.filter((s) => s.status === 'active').length > 0;

            return (
              <Tooltip key={track.id}>
                <TooltipTrigger asChild>
                  <DockIcon
                    onClick={() => workspaceActions.switchTrack(track.id)}
                    className={cn(
                      'relative bg-muted/50 hover:bg-muted border border-transparent transition-all',
                      isActive && 'bg-primary/20 border-primary'
                    )}
                  >
                    {isActive && (
                      <GlowEffect
                        mode="pulse"
                        colors={['hsl(var(--primary))', 'hsl(var(--primary) / 0.5)']}
                        blur="strong"
                        duration={2}
                        className="rounded-full"
                      />
                    )}
                    <Icon className="w-5 h-5" />
                    {hasActiveSegments && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </DockIcon>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p className="text-sm font-medium">{track.name}</p>
                  {hasActiveSegments && (
                    <p className="text-xs text-muted-foreground">Active segments</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Separator */}
          <div className="h-10 w-px bg-border mx-1" />

          {/* Add track button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <DockIcon
                onClick={handleAddTrack}
                className="bg-muted/30 hover:bg-muted border border-dashed border-muted-foreground/30"
              >
                <Plus className="w-5 h-5" />
              </DockIcon>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={10}>
              <p className="text-sm">New Track</p>
            </TooltipContent>
          </Tooltip>
        </DockPrimitive>
      </TooltipProvider>
    </div>
  );
}
