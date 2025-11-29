import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NextBubbleProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  accentColor?: string;
}

export function NextBubble({
  value,
  onChange,
  placeholder = "What's next?",
  className,
  accentColor,
}: NextBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    onChange(trimmed || null);
    setIsEditing(false);
  }, [editValue, onChange]);

  const handleCancel = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const isEmpty = !value || value.trim() === '';
  const textColor = accentColor || 'var(--foreground)';

  return (
    <div
      className={cn('flex items-center gap-2 w-full px-3 py-1.5 cursor-text', className)}
      style={{
        background: accentColor ? `${accentColor}12` : 'rgba(255,255,255,0.03)',
        borderLeft: accentColor ? `2px solid ${accentColor}50` : '2px solid rgba(255,255,255,0.15)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) {
          setEditValue(value || '');
          setIsEditing(true);
        }
      }}
    >
      <span className="text-xs font-medium" style={{ color: textColor }}>→</span>

      <input
        ref={inputRef}
        type="text"
        value={isEditing ? editValue : (value || '')}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setEditValue(value || '');
          setIsEditing(true);
        }}
        onBlur={handleSave}
        className="flex-1 bg-transparent text-xs font-medium outline-none min-w-0 uppercase tracking-wide"
        style={{ color: isEmpty && !isEditing ? 'var(--muted-foreground)' : textColor, opacity: isEmpty && !isEditing ? 0.6 : 1 }}
        placeholder={placeholder}
      />

      {isEmpty && !isEditing && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500/50 shrink-0" />
      )}
    </div>
  );
}
