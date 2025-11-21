import { useSnapshot } from 'valtio';
import { tracksStore, tracksActions } from '@/stores/tracks.store';
import { workspaceStore, workspaceActions } from '@/stores/workspace.store';
import { Plus, Home, Music, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="h-12 bg-background/95 backdrop-blur-xl border-t border-border flex items-center px-3 gap-2">
      {/* Track buttons */}
      {tracks.map((track) => {
        const Icon = TRACK_ICONS[track.icon || 'home'] || Home;
        const isActive = activeTrackId === track.id;

        return (
          <button
            key={track.id}
            onClick={() => workspaceActions.switchTrack(track.id)}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2 transition-all',
              'bg-muted/50 border border-transparent',
              'hover:bg-muted hover:border-muted-foreground/20',
              isActive && [
                'bg-primary/20 border-primary',
                'shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]',
              ]
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{track.name}</span>
            {track.segments.filter((s) => s.status === 'active').length > 0 && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        );
      })}

      {/* Add track button */}
      <button
        onClick={handleAddTrack}
        className="px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted border border-dashed border-muted-foreground/30 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Resource monitor placeholder */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>2.3GB</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span>45%</span>
        </div>
      </div>
    </div>
  );
}
