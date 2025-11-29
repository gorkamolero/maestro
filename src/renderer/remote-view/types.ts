// =============================================================================
// Remote View Types
// =============================================================================

/**
 * Quality preset for video streaming
 */
export type StreamQuality = 'low' | 'medium' | 'high';

export const QUALITY_PRESETS: Record<StreamQuality, {
  width: number;
  height: number;
  frameRate: number;
}> = {
  low: { width: 854, height: 480, frameRate: 15 },
  medium: { width: 1280, height: 720, frameRate: 30 },
  high: { width: 1920, height: 1080, frameRate: 60 },
};

/**
 * Serializable source info (safe to pass over IPC)
 */
export interface CaptureSource {
  id: string;
  name: string;
  thumbnail?: string; // Base64 data URL
}

/**
 * Information about a viewable browser tab
 */
export interface ViewableBrowser {
  id: string;
  label: string;
  url: string;
  title: string;
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Remote input event from mobile client
 */
export interface RemoteInput {
  type: 'click' | 'rightclick' | 'doubleclick' | 'scroll' | 'key' | 'move';
  x?: number;
  y?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
}

/**
 * Viewport information for coordinate mapping
 */
export interface ViewportInfo {
  /** Width of the video element on mobile */
  remoteWidth: number;
  /** Height of the video element on mobile */
  remoteHeight: number;
  /** Actual bounds of the target BrowserView */
  viewBounds: {
    width: number;
    height: number;
  };
}

/**
 * WebRTC signaling data (serializable)
 */
export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  data: unknown;
}

// =============================================================================
// IPC Message Types
// =============================================================================

export interface RemoteViewIPCAPI {
  // Main process provides these
  getSources: () => Promise<CaptureSource[]>;
  getBrowsers: () => Promise<ViewableBrowser[]>;
  getBrowserBounds: (browserId: string) => Promise<{ width: number; height: number }>;
  injectInput: (browserId: string, input: RemoteInput, viewport: ViewportInfo) => Promise<boolean>;
  
  // Signaling relay
  sendSignal: (clientId: string, signal: SignalData) => void;
  onSignal: (callback: (clientId: string, signal: SignalData) => void) => () => void;
  onViewerConnected: (callback: (clientId: string, browserId: string, quality: StreamQuality) => void) => () => void;
  onViewerDisconnected: (callback: (clientId: string) => void) => () => void;
}

// =============================================================================
// WebSocket Message Types (Mobile ↔ Server)
// =============================================================================

export interface WS_RemoteViewList {
  type: 'remote-view:list';
}

export interface WS_RemoteViewListResponse {
  type: 'remote-view:list';
  browsers: ViewableBrowser[];
}

export interface WS_RemoteViewStart {
  type: 'remote-view:start';
  browserId: string;
  quality: StreamQuality;
}

export interface WS_RemoteViewStarted {
  type: 'remote-view:started';
  browserId: string;
  bounds: { width: number; height: number };
}

export interface WS_RemoteViewSignal {
  type: 'remote-view:signal';
  signal: SignalData;
}

export interface WS_RemoteViewInput {
  type: 'remote-view:input';
  input: RemoteInput;
  viewport: ViewportInfo;
}

export interface WS_RemoteViewStop {
  type: 'remote-view:stop';
}

export interface WS_RemoteViewError {
  type: 'remote-view:error';
  error: string;
  code: 'NOT_FOUND' | 'CAPTURE_FAILED' | 'CONNECTION_FAILED';
}
