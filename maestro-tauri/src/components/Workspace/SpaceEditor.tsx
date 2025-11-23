import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import { Trash2 } from 'lucide-react';
import type { Space } from '@/types';

interface SpaceEditorProps {
  space?: Space;
  initialName?: string;
  initialIcon?: string;
  onSave: (name: string, icon?: string) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  mode: 'create' | 'edit';
}

export function SpaceEditor({
  space,
  initialName = '',
  initialIcon = '',
  onSave,
  onDelete,
  onCancel,
  mode,
}: SpaceEditorProps) {
  const [name, setName] = useState(initialName || space?.name || '');
  const [icon, setIcon] = useState(initialIcon || space?.icon || '');

  const handleSave = () => {
    const finalName = name.trim() || (mode === 'create' ? 'New Space' : space?.name || '');
    onSave(finalName, icon);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block">Space Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          placeholder="Enter space name"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block">
          Icon {mode === 'create' && '(optional)'}
        </label>
        <EmojiPickerComponent value={icon} onChange={setIcon}>
          <button
            type="button"
            className="w-full h-16 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center text-3xl"
          >
            {icon || '+'}
          </button>
        </EmojiPickerComponent>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 h-8 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {mode === 'create' ? 'Create Space' : 'Save Changes'}
        </button>
        {mode === 'edit' && onDelete && (
          <button
            onClick={onDelete}
            className="h-8 px-3 bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-colors"
            title="Delete space"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
