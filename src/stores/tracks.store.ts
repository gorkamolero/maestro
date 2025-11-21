import { proxy } from 'valtio';
import type { Track, Segment } from '@/types';

interface TracksState {
  tracks: Track[];
}

export const tracksStore = proxy<TracksState>({
  tracks: [],
});

export const tracksActions = {
  addTrack: (name: string): Track => {
    const newTrack: Track = {
      id: crypto.randomUUID(),
      name,
      position: tracksStore.tracks.length,
      color: '#64748b', // slate-500
      segments: [],
      markers: [],
    };
    tracksStore.tracks.push(newTrack);
    return newTrack;
  },

  removeTrack: (trackId: string) => {
    tracksStore.tracks = tracksStore.tracks.filter(t => t.id !== trackId);
  },

  updateTrack: (trackId: string, updates: Partial<Track>) => {
    const index = tracksStore.tracks.findIndex(t => t.id === trackId);
    if (index !== -1) {
      tracksStore.tracks[index] = { ...tracksStore.tracks[index], ...updates };
    }
  },

  reorderTracks: (tracks: Track[]) => {
    tracksStore.tracks = tracks;
  },

  addSegment: (trackId: string, segment: Segment) => {
    const track = tracksStore.tracks.find(t => t.id === trackId);
    if (track) {
      track.segments.push(segment);
    }
  },

  removeSegment: (trackId: string, segmentId: string) => {
    const track = tracksStore.tracks.find(t => t.id === trackId);
    if (track) {
      track.segments = track.segments.filter(s => s.id !== segmentId);
    }
  },

  updateSegment: (trackId: string, segmentId: string, updates: Partial<Segment>) => {
    const track = tracksStore.tracks.find(t => t.id === trackId);
    if (track) {
      const index = track.segments.findIndex(s => s.id === segmentId);
      if (index !== -1) {
        track.segments[index] = { ...track.segments[index], ...updates };
      }
    }
  },
};
