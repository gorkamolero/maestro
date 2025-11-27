import { useState } from 'react';
import { X, Terminal, Globe, AppWindow, CheckSquare, StickyNote } from 'lucide-react';
import type { Space } from '@/types';
import type { Tab, TabType } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { spacesActions } from '@/stores/spaces.store';
import { launcherStore } from '@/stores/launcher.store';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import { TabTypeIcon } from './TabPreview';

interface SpaceEditModeProps {
  space: Space;
  tabs: Tab[];
  onDone: () => void;
}

const TAB_TYPE_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  'app-launcher': 'App',
  tasks: 'Tasks',
  notes: 'Notes',
  agent: 'Agent',
};

export function SpaceEditMode({ space, tabs, onDone }: SpaceEditModeProps) {
  const [name, setName] = useState(space.name);

  const handleNameBlur = () => {
    if (name.trim() && name !== space.name) {
      spacesActions.updateSpace(space.id, { name: name.trim() });
    }
  };

  const handleIconChange = (icon: string) => {
    spacesActions.updateSpace(space.id, { icon });
  };

  const handleAddTab = (type: TabType) => {
    if (type === 'app-launcher') {
      // Open app launcher modal
      launcherStore.isAddModalOpen = true;
    } else {
      workspaceActions.openTab(space.id, type, `New ${TAB_TYPE_LABELS[type]}`);
    }
  };

  const handleRemoveTab = (tabId: string) => {
    workspaceActions.closeTab(tabId);
  };

  return (
    <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
      {/* Space name + icon row */}
      <div className="flex items-center gap-2">
        <EmojiPickerComponent value={space.icon} onChange={handleIconChange}>
          <button className="text-base hover:bg-white/[0.08] rounded p-1 transition-colors">
            {space.icon || '📁'}
          </button>
        </EmojiPickerComponent>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleNameBlur();
              e.currentTarget.blur();
            }
          }}
          className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-white/20 transition-colors"
        />

        <button
          onClick={onDone}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Done
        </button>
      </div>

      {/* Tab list with delete buttons */}
      {tabs.length > 0 && (
        <div className="space-y-1">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className="group/tab flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-white/[0.04]"
            >
              <TabTypeIcon type={tab.type} />
              <span className="flex-1 truncate text-muted-foreground">{tab.title}</span>
              <button
                onClick={() => handleRemoveTab(tab.id)}
                className="opacity-0 group-hover/tab:opacity-100 p-0.5 hover:bg-white/[0.08] rounded transition-all"
                title="Remove tab"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add tab buttons */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <button
          onClick={() => handleAddTab('terminal')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="w-3 h-3" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => handleAddTab('browser')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Globe className="w-3 h-3" />
          <span>Browser</span>
        </button>
        <button
          onClick={() => handleAddTab('notes')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
        >
          <StickyNote className="w-3 h-3" />
          <span>Notes</span>
        </button>
        <button
          onClick={() => handleAddTab('tasks')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
        >
          <CheckSquare className="w-3 h-3" />
          <span>Tasks</span>
        </button>
        <button
          onClick={() => handleAddTab('app-launcher')}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors"
        >
          <AppWindow className="w-3 h-3" />
          <span>App</span>
        </button>
      </div>
    </div>
  );
}
