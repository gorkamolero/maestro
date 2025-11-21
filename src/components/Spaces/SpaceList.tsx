import { useSnapshot } from 'valtio';
import { spacesStore } from '@/stores/spaces.store';
import { Space as SpaceComponent } from './Space';
import type { Space } from '@/types';

export function TrackList() {
  const { spaces } = useSnapshot(spacesStore);

  if (spaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No spaces yet. Click + to add a space.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {spaces.map((space) => (
        <SpaceComponent key={space.id} space={space as Space} />
      ))}
    </div>
  );
}
