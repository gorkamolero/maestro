import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { subscribe } from 'valtio';
import { timelineStore, timelineActions } from '@/stores/timeline.store';
import { tracksStore, tracksActions } from '@/stores/tracks.store';
import { segmentsStore } from '@/stores/segments.store';
import {
  initDB,
  saveWorkspace,
  loadWorkspace,
} from '@/lib/persistence';

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 1000; // 1 second

/**
 * Hook to handle state persistence with IndexedDB
 * - Loads state on mount
 * - Auto-saves every 30 seconds
 * - Saves on store changes (debounced)
 */
export function usePersistence() {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize DB and load saved state
  useEffect(() => {
    async function init() {
      await initDB();

      // Load saved state
      const savedData = await loadWorkspace();
      if (savedData) {
        console.log('[Persistence] Restoring workspace...');

        // Restore timeline state (except NOW which updates live)
        timelineActions.setZoomLevel(savedData.timeline.zoomLevel);
        timelineActions.setScrollPosition(savedData.timeline.scrollPosition);
        timelineActions.setBackgroundVariant(savedData.timeline.backgroundVariant);

        // Restore tracks
        tracksStore.tracks = savedData.tracks.map((track: any) => ({
          ...track,
          // Convert date strings back to Date objects in segments
          segments: track.segments.map((seg: any) => ({
            ...seg,
            startTime: new Date(seg.startTime),
            endTime: seg.endTime ? new Date(seg.endTime) : undefined,
          })),
        }));

        // Restore active segments
        segmentsStore.activeSegments = savedData.segments.map((seg: any) => ({
          ...seg,
          startTime: new Date(seg.startTime),
          endTime: seg.endTime ? new Date(seg.endTime) : undefined,
        }));

        console.log('[Persistence] Workspace restored', {
          tracks: tracksStore.tracks.length,
          segments: segmentsStore.activeSegments.length,
        });
      } else {
        console.log('[Persistence] No saved workspace found, starting fresh');
      }
    }

    init();
  }, []);

  // Debounced save function
  const scheduleSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await performSave();
    }, DEBOUNCE_DELAY);
  };

  // Actual save function
  const performSave = async () => {
    const data = {
      timeline: {
        zoomLevel: timelineStore.zoomLevel,
        scrollPosition: timelineStore.scrollPosition,
        backgroundVariant: timelineStore.backgroundVariant,
      },
      tracks: tracksStore.tracks,
      segments: segmentsStore.activeSegments,
    };

    await saveWorkspace(data);
  };

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribeTimeline = subscribe(timelineStore, scheduleSave);
    const unsubscribeTracks = subscribe(tracksStore, scheduleSave);
    const unsubscribeSegments = subscribe(segmentsStore, scheduleSave);

    return () => {
      unsubscribeTimeline();
      unsubscribeTracks();
      unsubscribeSegments();
    };
  }, []);

  // Auto-save interval (every 30 seconds)
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(async () => {
      await performSave();
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  // Save on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use synchronous localStorage as backup since IndexedDB is async
      const data = {
        timeline: {
          zoomLevel: timelineStore.zoomLevel,
          scrollPosition: timelineStore.scrollPosition,
          backgroundVariant: timelineStore.backgroundVariant,
        },
        tracks: tracksStore.tracks,
        segments: segmentsStore.activeSegments,
      };
      localStorage.setItem('maestro-backup', JSON.stringify(data));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
