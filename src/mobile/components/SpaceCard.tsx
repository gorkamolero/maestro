import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { SpaceInfo, TaskItem, TabInfo } from '@shared/types';
import { tasksApi, spacesApi } from '../lib/api';
import { SpaceEditSheet } from './SpaceEditSheet';

interface SpaceCardProps {
  space: SpaceInfo;
  variant: 'grid' | 'list' | 'pane';
  tabs?: TabInfo[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskCreate?: (content: string) => void;
  onTabClose?: (tabId: string) => void;
  onSpaceUpdate?: () => void; // Callback to refresh space data
  index?: number; // For staggered animations
}

export function SpaceCard({
  space,
  variant,
  tabs,
  onTaskToggle,
  onTaskCreate,
  onTabClose,
  onSpaceUpdate,
  index = 0,
}: SpaceCardProps) {
  const hasActivity = space.agentCount > 0;

  if (variant === 'list') {
    return <ListCard space={space} hasActivity={hasActivity} index={index} />;
  }

  if (variant === 'pane') {
    return (
      <PaneCard
        space={space}
        tabs={tabs}
        hasActivity={hasActivity}
        onTaskToggle={onTaskToggle}
        onTaskCreate={onTaskCreate}
        onTabClose={onTabClose}
        onSpaceUpdate={onSpaceUpdate}
      />
    );
  }

  // Grid variant - enhanced with What's Next, Tasks, Notes previews
  return (
    <Link
      to={`/space/${space.id}`}
      className="group block relative overflow-hidden rounded-[16px] bg-gradient-to-br from-surface-card to-surface-primary border border-white/[0.08] transition-all duration-300 hover:border-white/[0.12] active:scale-[0.98]"
      style={{
        animationDelay: `${index * 60}ms`,
        boxShadow: `
          0 2px 8px rgba(0,0,0,0.2),
          0 0 0 1px rgba(255,255,255,0.03) inset,
          ${hasActivity ? `0 0 20px ${space.color || '#10b981'}15` : ''}
        `,
      }}
    >
      {/* Grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-noise" />

      {/* Left color accent with glow */}
      <div
        className="absolute inset-y-0 left-0 w-1 transition-all duration-300 group-hover:w-1.5"
        style={{
          backgroundColor: space.color || '#4a4845',
          boxShadow: hasActivity ? `0 0 12px ${space.color || '#10b981'}40` : undefined,
        }}
      />

      {/* Subtle radial gradient from space color */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${space.color || '#ffffff'}, transparent 50%)`,
        }}
      />

      <div className="relative p-4 pl-5">
        {/* What's Next bubble */}
        {space.next && (
          <div className="mb-3 animate-fade-in" style={{ animationDelay: `${index * 60 + 100}ms` }}>
            <WhatsNextBubble text={space.next} color={space.color} />
          </div>
        )}

        {/* Header: Icon + Name + Activity */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <SpaceIcon space={space} size="md" hasActivity={hasActivity} />
            <div className="min-w-0">
              <h3 className="font-semibold text-content-primary truncate text-[15px] tracking-[-0.01em]">
                {space.name}
              </h3>
              <TabIconsRow tabs={tabs} max={5} />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasActivity && <ActivityPulse color={space.color} />}
            {space.agentCount > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                style={{
                  background: `linear-gradient(135deg, ${space.color || '#10b981'}25, ${space.color || '#10b981'}10)`,
                  color: space.color || '#10b981',
                  boxShadow: `0 0 8px ${space.color || '#10b981'}20`,
                }}
              >
                {space.agentCount} LIVE
              </span>
            )}
          </div>
        </div>

        {/* Content area - Tasks or Notes preview */}
        <div className="mt-3 min-h-[48px]">
          {space.contentMode === 'notes' && space.notesPreview ? (
            <NotesPreview text={space.notesPreview} />
          ) : space.tasks && space.tasks.length > 0 ? (
            <TasksPreview tasks={space.tasks.slice(0, 3)} color={space.color} />
          ) : (
            <div className="text-[12px] text-content-tertiary/60 italic font-light">
              Ready for tasks...
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <WarmthDots count={space.tabCount} max={5} color={space.color} />
            <span className="text-[11px] text-content-tertiary font-medium tracking-wide">
              {space.tabCount} tab{space.tabCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1 text-content-tertiary group-hover:text-content-secondary transition-colors">
            <span className="text-[10px] font-medium uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              Open
            </span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Compact list variant
function ListCard({ space, hasActivity, index }: { space: SpaceInfo; hasActivity: boolean; index: number }) {
  return (
    <Link
      to={`/space/${space.id}`}
      className="group flex items-center gap-4 p-4 bg-gradient-to-r from-surface-card to-transparent border border-white/[0.06] rounded-[14px] transition-all duration-200 hover:border-white/[0.1] active:scale-[0.99]"
      style={{
        animationDelay: `${index * 40}ms`,
      }}
    >
      {/* Left color bar with subtle glow */}
      <div
        className="w-1 h-12 rounded-full shrink-0 transition-all duration-200 group-hover:h-14"
        style={{
          backgroundColor: space.color || '#4a4845',
          boxShadow: hasActivity ? `0 0 8px ${space.color}50` : undefined,
        }}
      />

      {/* Icon */}
      <SpaceIcon space={space} size="md" hasActivity={hasActivity} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-content-primary truncate tracking-[-0.01em]">{space.name}</h3>
          {space.next && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full truncate max-w-[80px]"
              style={{
                background: `${space.color || '#fbbf24'}15`,
                color: space.color || '#fbbf24',
              }}
            >
              {space.next}
            </span>
          )}
        </div>
        <p className="text-[12px] text-content-secondary mt-0.5">
          {space.tabCount} tabs
          {space.agentCount > 0 && (
            <span style={{ color: space.color || '#10b981' }}> · {space.agentCount} active</span>
          )}
        </p>
      </div>

      {/* Activity indicator */}
      {hasActivity && <ActivityPulse color={space.color} />}

      <ChevronRight className="w-5 h-5 text-content-tertiary shrink-0 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// Full pane variant - for horizontal swipe view
function PaneCard({
  space,
  tabs,
  hasActivity,
  onTaskToggle,
  onTaskCreate,
  onTabClose,
  onSpaceUpdate,
}: {
  space: SpaceInfo;
  tabs?: TabInfo[];
  hasActivity: boolean;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskCreate?: (content: string) => void;
  onTabClose?: (tabId: string) => void;
  onSpaceUpdate?: () => void;
}) {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Handle task toggle via API - wait for success before calling callback
  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await tasksApi.toggle(space.id, taskId);
      // Only update UI after successful API call
      if (onTaskToggle) {
        onTaskToggle(taskId, completed);
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
      // TODO: Show error toast to user
    }
  }, [space.id, onTaskToggle]);

  // Handle task creation via API
  const handleCreateTask = useCallback(async () => {
    const content = newTaskContent.trim();
    if (!content) return;

    setIsCreatingTask(true);
    try {
      await tasksApi.create(space.id, content);
      setNewTaskContent('');
      if (onTaskCreate) onTaskCreate(content);
      if (onSpaceUpdate) onSpaceUpdate();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  }, [space.id, newTaskContent, onTaskCreate, onSpaceUpdate]);

  // Handle tab close via API
  const handleTabClose = useCallback(async (tabId: string) => {
    if (onTabClose) onTabClose(tabId);
    try {
      await spacesApi.closeTab(space.id, tabId);
      if (onSpaceUpdate) onSpaceUpdate();
    } catch (err) {
      console.error('Failed to close tab:', err);
    }
  }, [space.id, onTabClose, onSpaceUpdate]);

  return (
    <div
      className="h-full flex flex-col rounded-[20px] border border-white/[0.08] overflow-hidden"
      style={{
        background: `linear-gradient(180deg,
          ${space.color}08 0%,
          rgba(26,24,22,1) 30%,
          rgba(18,17,15,1) 100%
        )`,
        boxShadow: `
          0 4px 24px rgba(0,0,0,0.3),
          0 0 0 1px rgba(255,255,255,0.04) inset
        `,
      }}
    >
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-noise" />

      {/* Header */}
      <div
        className="relative p-5 border-b border-white/[0.06]"
        style={{
          background: `linear-gradient(135deg, ${space.color}12 0%, transparent 60%)`,
        }}
      >
        {/* Decorative element */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-[0.08] blur-2xl pointer-events-none"
          style={{ background: space.color }}
        />

        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <SpaceIcon space={space} size="lg" hasActivity={hasActivity} />
            <div>
              <h2 className="text-[18px] font-bold text-content-primary tracking-[-0.02em]">
                {space.name}
              </h2>
              <p className="text-[12px] text-content-secondary mt-0.5 font-medium">
                {space.tabCount} tabs · {space.agentCount} agent{space.agentCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActivity && <ActivityPulse color={space.color} size="lg" />}
            <button
              onClick={() => setIsEditSheetOpen(true)}
              className="p-2 rounded-lg hover:bg-white/[0.06] text-content-tertiary hover:text-content-secondary transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* What's Next */}
        {space.next && (
          <WhatsNextBubble text={space.next} color={space.color} variant="large" />
        )}
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
        {/* Task Creation Input */}
        <div className="animate-fade-in">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateTask();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              placeholder="Add a task..."
              disabled={isCreatingTask}
              className="flex-1 px-4 py-3 rounded-[12px] bg-surface-card border border-white/[0.08] text-[14px] text-content-primary placeholder:text-content-tertiary focus:outline-none focus:border-white/[0.15] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent)',
              }}
            />
            <button
              type="submit"
              disabled={!newTaskContent.trim() || isCreatingTask}
              className="px-4 py-3 rounded-[12px] text-[14px] font-semibold transition-all duration-200 active:scale-[0.95] disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${space.color}40, ${space.color}20)`,
                color: space.color || '#fff',
              }}
            >
              {isCreatingTask ? '...' : '+'}
            </button>
          </form>
        </div>

        {/* Tasks Section */}
        {space.tasks && space.tasks.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <SectionHeader title="Tasks" count={space.tasks.length} />
            <TasksList tasks={space.tasks} onToggle={handleTaskToggle} color={space.color} spaceId={space.id} />
          </section>
        )}

        {/* Notes Section */}
        {space.notesPreview && (
          <section className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <SectionHeader title="Notes" />
            <div
              className="p-4 rounded-[12px] border border-white/[0.04]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.02), transparent)',
              }}
            >
              <p className="text-[13px] text-content-secondary leading-relaxed font-light">
                {space.notesPreview}
              </p>
            </div>
          </section>
        )}

        {/* Tabs Section */}
        {tabs && tabs.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <SectionHeader title="Tabs" count={tabs.length} />
            <TabsList tabs={tabs} onClose={handleTabClose} />
          </section>
        )}

        {/* Empty state */}
        {(!space.tasks || space.tasks.length === 0) && !space.notesPreview && (!tabs || tabs.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: `${space.color}15` }}
            >
              {space.icon || '📁'}
            </div>
            <p className="text-content-secondary font-medium">This space is empty</p>
            <p className="text-content-tertiary text-[12px] mt-1">Add a task above to get started</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-white/[0.06] bg-surface-primary/50 backdrop-blur-sm flex gap-2">
        <button
          onClick={() => spacesApi.createTerminal(space.id)}
          className="flex-1 py-3 rounded-[12px] text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] bg-surface-card border border-white/[0.06] text-content-secondary"
        >
          <span>⬛</span> Terminal
        </button>
        <Link
          to={`/space/${space.id}`}
          className="flex-1 py-3 rounded-[12px] text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${space.color}30, ${space.color}15)`,
            color: space.color || '#fff',
            boxShadow: `0 0 20px ${space.color}15`,
          }}
        >
          Open Space
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Space Edit Sheet */}
      <SpaceEditSheet
        spaceId={space.id}
        initialName={space.name}
        initialNext={space.next}
        initialColor={space.color}
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        onSaved={() => onSpaceUpdate?.()}
      />
    </div>
  );
}

// Section header component
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-bold text-content-tertiary uppercase tracking-[0.1em]">
        {title}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] text-content-tertiary/60 font-medium">{count}</span>
      )}
    </div>
  );
}

// What's Next bubble component
function WhatsNextBubble({
  text,
  color,
  variant = 'compact',
}: {
  text: string;
  color?: string;
  variant?: 'compact' | 'large';
}) {
  const accentColor = color || '#fbbf24';

  if (variant === 'large') {
    return (
      <div
        className="mt-4 p-4 rounded-[12px] border backdrop-blur-sm"
        style={{
          background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}05)`,
          borderColor: `${accentColor}25`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${accentColor}20` }}
          >
            <span style={{ color: accentColor }} className="text-[12px] font-bold">→</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-content-tertiary block mb-1">
              What's Next
            </span>
            <p className="text-[14px] font-medium leading-snug" style={{ color: accentColor }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{
        background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
        color: accentColor,
        boxShadow: `0 0 12px ${accentColor}15`,
      }}
    >
      <span className="text-[8px]">→</span>
      <span className="truncate max-w-[120px]">{text}</span>
    </div>
  );
}

// Tasks preview for grid cards
function TasksPreview({ tasks, color }: { tasks: TaskItem[]; color?: string }) {
  return (
    <div className="space-y-1.5">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="flex items-center gap-2.5 animate-fade-in"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <TaskCheckbox completed={task.completed} color={color} size="sm" />
          <span
            className={`text-[12px] truncate transition-all ${
              task.completed
                ? 'text-content-tertiary/50 line-through'
                : 'text-content-secondary'
            }`}
          >
            {task.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// Full tasks list for pane view
function TasksList({
  tasks,
  onToggle,
  color,
  spaceId,
}: {
  tasks: TaskItem[];
  onToggle?: (taskId: string, completed: boolean) => void;
  color?: string;
  spaceId?: string;
}) {
  const handleDelete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!spaceId) return;
    try {
      await tasksApi.delete(spaceId, taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="group flex items-center gap-3 p-3 rounded-[10px] border border-white/[0.04] transition-all duration-200"
          style={{
            background: task.completed
              ? 'transparent'
              : 'linear-gradient(135deg, rgba(255,255,255,0.02), transparent)',
            animationDelay: `${i * 30}ms`,
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggle?.(task.id, !task.completed);
            }}
            className="flex items-center gap-3 flex-1 text-left active:scale-[0.99]"
          >
            <TaskCheckbox completed={task.completed} color={color} size="md" />
            <span
              className={`text-[14px] flex-1 transition-all ${
                task.completed
                  ? 'text-content-tertiary/50 line-through'
                  : 'text-content-primary'
              }`}
            >
              {task.text}
            </span>
          </button>
          {spaceId && (
            <button
              onClick={(e) => handleDelete(task.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-content-tertiary hover:text-red-400 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Unified task checkbox
function TaskCheckbox({
  completed,
  color,
  size = 'md',
}: {
  completed: boolean;
  color?: string;
  size?: 'sm' | 'md';
}) {
  const dimensions = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const checkSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';
  const accentColor = color || '#10b981';

  return (
    <span
      className={`${dimensions} rounded-[4px] border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200`}
      style={{
        borderColor: completed ? accentColor : 'rgba(255,255,255,0.2)',
        background: completed ? `${accentColor}20` : 'transparent',
        boxShadow: completed ? `0 0 8px ${accentColor}30` : undefined,
      }}
    >
      {completed && (
        <svg className={`${checkSize}`} viewBox="0 0 12 12" fill="none" style={{ color: accentColor }}>
          <path
            d="M2 6l3 3 5-6"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

// Notes preview
function NotesPreview({ text }: { text: string }) {
  return (
    <p className="text-[12px] text-content-secondary/70 leading-relaxed line-clamp-3 font-light italic">
      "{text}"
    </p>
  );
}

// Tab icons row for grid cards
function TabIconsRow({ tabs, max }: { tabs?: TabInfo[]; max: number }) {
  if (!tabs || tabs.length === 0) return null;

  const visibleTabs = tabs.slice(0, max);
  const remaining = tabs.length - max;

  return (
    <div className="flex items-center gap-1 mt-1">
      {visibleTabs.map((tab, i) => (
        <TabIcon key={tab.id} tab={tab} style={{ animationDelay: `${i * 30}ms` }} />
      ))}
      {remaining > 0 && (
        <span className="text-[9px] text-content-tertiary font-medium ml-0.5">+{remaining}</span>
      )}
    </div>
  );
}

// Full tabs list for pane view
function TabsList({ tabs, onClose }: { tabs: TabInfo[]; onClose?: (tabId: string) => void }) {
  return (
    <div className="space-y-1.5">
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          className="group flex items-center gap-3 p-2.5 rounded-[10px] border border-white/[0.03] bg-white/[0.01]"
          style={{ animationDelay: `${i * 30}ms` }}
        >
          <TabIcon tab={tab} size="md" />
          <span className="text-[13px] text-content-secondary truncate flex-1">
            {tab.title || tab.type}
          </span>
          {tab.type === 'terminal' && (
            <span className="text-[9px] text-content-tertiary/60 font-mono px-2 py-0.5 bg-surface-hover rounded">
              term
            </span>
          )}
          {tab.workingDir && (
            <span className="text-[9px] text-content-tertiary/40 truncate max-w-[80px]">
              {tab.workingDir.split('/').pop()}
            </span>
          )}
          {onClose && (
            <button
              onClick={() => onClose(tab.id)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/20 text-content-tertiary hover:text-red-400 transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TabIcon({
  tab,
  size = 'sm',
  style,
}: {
  tab: TabInfo;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[11px]' : 'w-6 h-6 text-[12px]';
  const iconMap: Record<string, string> = {
    terminal: '⬛',
    browser: '🌐',
    notes: '📝',
    tasks: '✓',
    'app-launcher': '📦',
  };

  return (
    <span
      className={`${sizeClass} rounded-[6px] flex items-center justify-center shrink-0 animate-fade-in`}
      style={{
        background: tab.appColor ? `${tab.appColor}20` : 'rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {tab.emoji || iconMap[tab.type] || '📄'}
    </span>
  );
}

function SpaceIcon({
  space,
  size,
  hasActivity,
}: {
  space: SpaceInfo;
  size: 'md' | 'lg';
  hasActivity?: boolean;
}) {
  const sizeClasses = size === 'lg' ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-base';

  return (
    <div
      className={`${sizeClasses} rounded-[12px] flex items-center justify-center shrink-0 relative transition-transform duration-200 hover:scale-105`}
      style={{
        background: `linear-gradient(135deg, ${space.color || 'rgba(255,255,255,0.1)'}30, ${space.color || 'rgba(255,255,255,0.1)'}10)`,
        boxShadow: hasActivity
          ? `0 0 16px ${space.color}30, 0 2px 8px rgba(0,0,0,0.2)`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {space.icon || '📁'}
      {hasActivity && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-card"
          style={{ background: space.color || '#10b981' }}
        />
      )}
    </div>
  );
}

function WarmthDots({ count, max, color }: { count: number; max: number; color?: string }) {
  const filled = Math.min(count, max);
  const empty = max - filled;

  return (
    <div className="flex gap-1">
      {[...Array(filled)].map((_, i) => (
        <span
          key={`f-${i}`}
          className="w-1.5 h-1.5 rounded-full transition-all"
          style={{
            background: color || 'rgba(255,255,255,0.4)',
            boxShadow: `0 0 4px ${color || 'rgba(255,255,255,0.2)'}`,
          }}
        />
      ))}
      {[...Array(empty)].map((_, i) => (
        <span key={`e-${i}`} className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
      ))}
    </div>
  );
}

function ActivityPulse({ color, size = 'sm' }: { color?: string; size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5';
  const accentColor = color || '#10b981';

  return (
    <span className={`relative flex ${dimensions} shrink-0`}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: accentColor }}
      />
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}60`,
        }}
      />
    </span>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
