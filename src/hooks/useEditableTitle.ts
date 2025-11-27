import { useState, useCallback, useEffect, useRef } from 'react';
import { spacesActions } from '@/stores/spaces.store';

interface UseEditableTitleOptions {
  spaceId: string;
  spaceName: string;
}

export function useEditableTitle({ spaceId, spaceName }: UseEditableTitleOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(spaceName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // When editing, show the editable value; when not editing, show spaceName directly
  // This keeps the display in sync without needing effect-based state updates
  const displayValue = isEditing ? value : spaceName;

  const startEditing = useCallback(() => {
    setValue(spaceName);
    setIsEditing(true);
  }, [spaceName]);

  const save = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== spaceName) {
      spacesActions.updateSpace(spaceId, { name: trimmed });
    }
    setIsEditing(false);
  }, [value, spaceId, spaceName]);

  const cancel = useCallback(() => {
    setValue(spaceName);
    setIsEditing(false);
  }, [spaceName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        save();
      } else if (e.key === 'Escape') {
        cancel();
      }
    },
    [save, cancel]
  );

  return {
    isEditing,
    value: displayValue,
    setValue,
    inputRef,
    startEditing,
    save,
    cancel,
    handleKeyDown,
  };
}
