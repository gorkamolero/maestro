import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface NextBubbleProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function NextBubble({
  value,
  onChange,
  placeholder = "What's next?",
  className,
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

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditValue(value || '');
      setIsEditing(true);
    },
    [value]
  );

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

  if (isEditing) {
    return (
      <div
        className={cn('flex items-center gap-2', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-muted-foreground text-xs">→</span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 bg-transparent text-xs outline-none min-w-0 text-foreground"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      className={cn('flex items-center gap-2 text-left w-full group/next', className)}
    >
      <span className="text-muted-foreground text-xs">→</span>
      {isEmpty ? (
        <>
          <span className="flex-1 text-xs text-muted-foreground/50 group-hover/next:text-muted-foreground transition-colors">
            {placeholder}
          </span>
          {/* Red dot - very small, muted */}
          <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
        </>
      ) : (
        <span className="flex-1 text-xs text-muted-foreground group-hover/next:text-foreground transition-colors truncate">
          {value}
        </span>
      )}
    </button>
  );
}
