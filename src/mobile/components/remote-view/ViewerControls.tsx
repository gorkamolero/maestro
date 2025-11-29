import { SignalHigh, SignalLow, SignalMedium, X } from 'lucide-react';

interface ViewerControlsProps {
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (q: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  connected: boolean;
}

const QUALITY_CONFIG = {
  low: { label: '480p', icon: SignalLow },
  medium: { label: '720p', icon: SignalMedium },
  high: { label: '1080p', icon: SignalHigh }
} as const;

export function ViewerControls({ quality, onQualityChange, onDisconnect, connected }: ViewerControlsProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 bg-surface-primary border-t border-white/[0.08]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-3 h-11">
        {/* Quality selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-hover border border-white/[0.06]">
          {(['low', 'medium', 'high'] as const).map((q) => {
            const isActive = quality === q;
            const Icon = QUALITY_CONFIG[q].icon;
            return (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors active:scale-[0.97] ${
                  isActive
                    ? 'bg-white/[0.08] text-content-primary'
                    : 'text-content-tertiary hover:text-content-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{QUALITY_CONFIG[q].label}</span>
              </button>
            );
          })}
        </div>

        {/* Status + End */}
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-[11px] font-medium text-content-secondary uppercase tracking-wider">
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>

          {/* End button */}
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 active:scale-[0.97] transition-transform"
          >
            <X className="w-3.5 h-3.5" />
            <span>End</span>
          </button>
        </div>
      </div>
    </div>
  );
}
