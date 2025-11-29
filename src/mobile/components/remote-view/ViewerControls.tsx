import { SignalHigh, SignalLow, SignalMedium, X } from 'lucide-react';

interface ViewerControlsProps {
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (q: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  connected: boolean;
}

const QUALITY_CONFIG = {
  low: { label: '480p', icon: SignalLow, description: 'Lower quality, faster' },
  medium: { label: '720p', icon: SignalMedium, description: 'Balanced' },
  high: { label: '1080p', icon: SignalHigh, description: 'Best quality' }
} as const;

export function ViewerControls({ quality, onQualityChange, onDisconnect, connected }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {/* Main control bar - glass card style */}
      <div
        className="relative overflow-hidden backdrop-blur-xl rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(32, 31, 29, 0.95) 0%, rgba(25, 25, 28, 0.98) 100%)',
          boxShadow: `
            inset 0 1px 0 0 rgba(255,255,255,0.06),
            inset 0 0 0 1px rgba(255,255,255,0.08),
            0 -8px 32px -4px rgba(0,0,0,0.5),
            0 4px 24px -4px rgba(0,0,0,0.3)
          `,
        }}
      >
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-noise" />

        {/* Content */}
        <div className="relative p-3.5">
          <div className="flex items-center gap-3">

            {/* Quality Selector - Segmented Control */}
            <div
              className="flex gap-0.5 p-1 rounded-xl flex-1"
              style={{
                background: 'rgba(15, 14, 13, 0.6)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
              }}
            >
              {(['low', 'medium', 'high'] as const).map((q) => {
                const isActive = quality === q;
                const Icon = QUALITY_CONFIG[q].icon;
                return (
                  <button
                    key={q}
                    onClick={() => onQualityChange(q)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all active:scale-[0.97]"
                    style={{
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.12) 100%)'
                        : 'transparent',
                      boxShadow: isActive
                        ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.2), 0 0 12px rgba(245, 158, 11, 0.1)'
                        : 'none',
                      border: isActive ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid transparent',
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5 transition-colors"
                      style={{ color: isActive ? '#f59e0b' : '#57534e' }}
                    />
                    <span
                      className="text-[11px] font-semibold tracking-wide transition-colors"
                      style={{ color: isActive ? '#f59e0b' : '#a8a29e' }}
                    >
                      {QUALITY_CONFIG[q].label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Connection Status - Pill */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
              style={{
                background: connected
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.08) 100%)',
                border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-60 ${connected ? 'animate-ping' : 'animate-pulse'}`}
                  style={{ background: connected ? '#10b981' : '#f59e0b' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{
                    background: connected ? '#10b981' : '#f59e0b',
                    boxShadow: `0 0 6px ${connected ? '#10b981' : '#f59e0b'}`,
                  }}
                />
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.08em]"
                style={{ color: connected ? '#10b981' : '#f59e0b' }}
              >
                {connected ? 'Live' : 'Sync'}
              </span>
            </div>

            {/* End Button */}
            <button
              onClick={onDisconnect}
              className="group flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-[0.94]"
              style={{
                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.12) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
              }}
            >
              <X
                className="w-5 h-5 transition-transform group-active:rotate-90"
                style={{ color: '#ef4444' }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
