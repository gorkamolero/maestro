import React from 'react';

interface ViewerControlsProps {
  quality: 'low' | 'medium' | 'high';
  onQualityChange: (q: 'low' | 'medium' | 'high') => void;
  onDisconnect: () => void;
  connected: boolean;
}

export function ViewerControls({ quality, onQualityChange, onDisconnect, connected }: ViewerControlsProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button
              key={q}
              onClick={() => onQualityChange(q)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                quality === q
                  ? 'bg-white text-black'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {q.charAt(0).toUpperCase() + q.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-white/60 text-xs">
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>

        <button
          onClick={onDisconnect}
          className="px-4 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-sm font-medium rounded-full transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}
