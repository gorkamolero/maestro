import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';
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

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(value || '');
    setIsEditing(true);
  }, [value]);

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
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-left w-full',
        isEmpty
          ? 'bg-muted/30 border-dashed border-border hover:bg-muted/50'
          : 'bg-muted/50 border-border hover:bg-muted/70',
        className
      )}
    >
      <Pencil className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      {isEmpty ? (
        <>
          <span className="flex-1 text-sm text-muted-foreground truncate">
            {placeholder}
          </span>
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        </>
      ) : (
        <span className="flex-1 text-sm truncate">{value}</span>
      )}
    </button>
  );
}
