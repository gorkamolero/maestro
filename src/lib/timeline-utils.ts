import type { ZoomLevel } from '@/types';

export const TRACK_HEIGHT = 80; // Height of each track lane in pixels

// Pixels per minute at different zoom levels
const ZOOM_SCALES: Record<ZoomLevel, number> = {
  hour: 2,    // 120px per hour
  day: 0.5,   // 720px per day
  week: 0.1,  // ~1000px per week
  month: 0.025, // ~1080px per month
};

export function getPixelsPerMinute(zoomLevel: ZoomLevel): number {
  return ZOOM_SCALES[zoomLevel];
}

// Convert a Date to x-position in pixels
export function timeToPixels(date: Date, zoomLevel: ZoomLevel, referenceTime: Date): number {
  const minutesDiff = (date.getTime() - referenceTime.getTime()) / 60000;
  return minutesDiff * getPixelsPerMinute(zoomLevel);
}

// Convert x-position in pixels to Date
export function pixelsToTime(pixels: number, zoomLevel: ZoomLevel, referenceTime: Date): Date {
  const minutes = pixels / getPixelsPerMinute(zoomLevel);
  return new Date(referenceTime.getTime() + minutes * 60000);
}

// Minimum segment widths for different zoom levels (in pixels)
const MIN_SEGMENT_WIDTH: Record<ZoomLevel, number> = {
  hour: 100,   // 50 minutes at hour zoom
  day: 60,     // 2 hours at day zoom
  week: 40,    // 6.6 hours at week zoom
  month: 30,   // 20 hours at month zoom
};

// Calculate segment width in pixels based on duration
export function getSegmentWidth(
  startTime: Date,
  endTime: Date | undefined,
  zoomLevel: ZoomLevel,
  referenceTime: Date,
  nowTime: Date
): number {
  const end = endTime || nowTime;
  const startX = timeToPixels(startTime, zoomLevel, referenceTime);
  const endX = timeToPixels(end, zoomLevel, referenceTime);
  return Math.max(endX - startX, MIN_SEGMENT_WIDTH[zoomLevel]);
}
