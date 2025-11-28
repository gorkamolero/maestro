import { useState, useCallback, useEffect } from 'react';
import { spacesApi, type SpaceUpdatePayload } from '../lib/api';

interface SpaceEditSheetProps {
  spaceId: string;
  initialName: string;
  initialNext?: string | null;
  initialColor?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const COLOR_OPTIONS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

export function SpaceEditSheet({
  spaceId,
  initialName,
  initialNext,
  initialColor,
  isOpen,
  onClose,
  onSaved,
}: SpaceEditSheetProps) {
  const [name, setName] = useState(initialName);
  const [next, setNext] = useState(initialNext || '');
  const [color, setColor] = useState(initialColor || '#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setNext(initialNext || '');
      setColor(initialColor || '#3b82f6');
    }
  }, [isOpen, initialName, initialNext, initialColor]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updates: SpaceUpdatePayload = {};

      if (name !== initialName) {
        updates.name = name;
      }
      if (color !== initialColor) {
        updates.primaryColor = color;
      }

      // Update space properties
      if (Object.keys(updates).length > 0) {
        await spacesApi.updateSpace(spaceId, updates);
      }

      // Update "What's Next" separately
      const nextValue = next.trim() || null;
      if (nextValue !== initialNext) {
        await spacesApi.setNext(spaceId, nextValue);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save space:', err);
    } finally {
      setIsSaving(false);
    }
  }, [spaceId, name, next, color, initialName, initialNext, initialColor, onSaved, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-white/[0.08] rounded-t-[24px] animate-slide-up"
        style={{
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-bold text-content-primary">Edit Space</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-hover text-content-tertiary"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-5">
            {/* Name field */}
            <div>
              <label className="block text-[11px] font-bold text-content-tertiary uppercase tracking-wider mb-2">
                Space Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Space"
                className="w-full px-4 py-3 rounded-[12px] bg-surface-card border border-white/[0.08] text-[15px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-white/[0.2]"
              />
            </div>

            {/* What's Next field */}
            <div>
              <label className="block text-[11px] font-bold text-content-tertiary uppercase tracking-wider mb-2">
                What's Next
              </label>
              <input
                type="text"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="e.g., Finish auth flow..."
                className="w-full px-4 py-3 rounded-[12px] bg-surface-card border border-white/[0.08] text-[15px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-white/[0.2]"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-[11px] font-bold text-content-tertiary uppercase tracking-wider mb-3">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-9 h-9 rounded-full transition-all duration-200 ${
                      color === c ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-surface-elevated' : ''
                    }`}
                    style={{
                      backgroundColor: c,
                      boxShadow: color === c ? `0 0 16px ${c}60` : `0 2px 6px ${c}30`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 rounded-[12px] text-[14px] font-semibold bg-surface-card border border-white/[0.08] text-content-secondary transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex-1 py-3.5 rounded-[12px] text-[14px] font-bold transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${color}50, ${color}30)`,
                color: '#fff',
                boxShadow: `0 0 20px ${color}30`,
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Add slide-up animation
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 300ms ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
