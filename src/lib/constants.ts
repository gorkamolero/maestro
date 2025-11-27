/**
 * UI Constants
 * Centralized configuration for magic numbers and values used across components.
 */

// =============================================================================
// Tab & List Display
// =============================================================================

/** Maximum visible tabs in SpaceCard tab preview */
export const TABS_MAX_VISIBLE = 6;

/** Maximum visible tabs in TabPreviewList (default) */
export const TAB_PREVIEW_MAX_VISIBLE = 12;

// =============================================================================
// Data Limits & Buffers
// =============================================================================

/** Maximum number of recently closed tabs to keep in history */
export const RECENTLY_CLOSED_TABS_LIMIT = 10;

/** Maximum terminal output lines to buffer per agent session */
export const TERMINAL_LINES_BUFFER_SIZE = 100;

/** Maximum URL history entries to keep */
export const URL_HISTORY_LIMIT = 1000;

// =============================================================================
// Animation Durations (in seconds for Framer Motion)
// =============================================================================

/** Fast micro-interactions (hover states, small UI feedback) */
export const ANIMATION_DURATION_FAST = 0.1;

/** Standard UI animations (collapsible sections, fades) */
export const ANIMATION_DURATION_NORMAL = 0.2;

/** Slower, more noticeable transitions */
export const ANIMATION_DURATION_SLOW = 0.35;

// =============================================================================
// Timing & Delays (in milliseconds)
// =============================================================================

/** Tooltip show delay - 0 for instant tooltips */
export const TOOLTIP_DELAY_DURATION = 0;

/** Toast/notification display duration for errors */
export const TOAST_DURATION_ERROR = 10000;

/** Toast/notification display duration for standard messages */
export const TOAST_DURATION_DEFAULT = 5000;

// =============================================================================
// Layout
// =============================================================================

/** Default space card width */
export const SPACE_CARD_WIDTH = 280;

/** Minimum pane width in sliding panes view */
export const PANE_MIN_WIDTH = 280;

/** Maximum pane width in sliding panes view */
export const PANE_MAX_WIDTH = 400;
