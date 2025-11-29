interface ViewerControlsProps {
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (q: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  connected: boolean;
}

const QUALITY_LABELS = {
  low: '480p',
  medium: '720p',
  high: '1080p'
} as const;

export function ViewerControls({ quality, onQualityChange, onDisconnect, connected }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {/* Glassmorphic control bar */}
      <div className="bg-surface-card/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">

          {/* Quality Selector */}
          <div className="flex gap-1 bg-surface-primary/50 rounded-xl p-1">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  quality === q
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-content-tertiary active:text-content-secondary'
                }`}
              >
                {QUALITY_LABELS[q]}
              </button>
            ))}
          </div>

          {/* Live Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`relative ${connected ? '' : 'animate-pulse'}`}>
              <span className={`w-2 h-2 rounded-full block ${
                connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              {connected && (
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
              )}
            </div>
            <span className="text-[11px] font-medium text-content-secondary">
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>

          {/* End Button */}
          <button
            onClick={onDisconnect}
            className="px-4 py-1.5 bg-red-500/15 border border-red-500/25 text-red-400 text-[12px] font-medium rounded-xl
              active:bg-red-500/25 transition-colors"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
