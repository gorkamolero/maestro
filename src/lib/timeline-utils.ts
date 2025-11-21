import type { ZoomLevel } from '@/types';

export const TRACK_HEIGHT = 80; // Height of each space lane in pixels

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

// Minimum segment width (in pixels) - keep it small so segments grow naturally
const MIN_SEGMENT_WIDTH = 8;

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
  const naturalWidth = endX - startX;

  // Only apply minimum width if the segment has been running for at least a few seconds
  // This lets new segments start very small and grow naturally
  return Math.max(naturalWidth, MIN_SEGMENT_WIDTH);
}
