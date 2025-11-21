import { useSnapshot } from 'valtio';
import { tracksStore } from '@/stores/tracks.store';
import { Track } from './Track';

export function TrackList() {
  const { tracks } = useSnapshot(tracksStore);

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No tracks yet. Click + to add a track.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {tracks.map((track) => (
        <Track key={track.id} track={track} />
      ))}
    </div>
  );
}
