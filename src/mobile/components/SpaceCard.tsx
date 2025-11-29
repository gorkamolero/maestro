import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { SpaceInfo, TaskItem, TabInfo } from '@shared/types';
import { tasksApi } from '../lib/api';
import { SpaceEditSheet } from './SpaceEditSheet';
import { NotesEditor } from './NotesEditor';
import { TabsRow } from './TabsRow';

interface SpaceCardProps {
  space: SpaceInfo;
  variant: 'grid' | 'list' | 'pane';
  tabs?: TabInfo[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskCreate?: (content: string) => void;
  onTabClose?: (tabId: string) => void;
  onSpaceUpdate?: () => void;
  index?: number;
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
  const accentColor = space.color || '#f59e0b';

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

  // === GRID VARIANT - Desktop Glassmorphism Style ===
  return (
    <Link
      to={`/space/${space.id}`}
      className="group block relative overflow-hidden rounded-xl backdrop-blur-xl transition-all duration-300 active:scale-[0.98]"
      style={{
        animationDelay: `${index * 50}ms`,
        // Left accent bar
        borderLeft: `3px solid ${accentColor}`,
        // Glassmorphism background with color tint
        background: `linear-gradient(180deg, ${accentColor}10 0%, transparent 50%), rgba(25, 25, 28, 0.8)`,
        // Layered shadow system matching desktop
        boxShadow: `
          inset 0 1px 0 0 rgba(255,255,255,0.05),
          inset 0 0 0 1px rgba(255,255,255,0.08),
          0 8px 32px -8px rgba(0,0,0,0.5)
          ${hasActivity ? `, 0 0 30px -10px ${accentColor}50` : ''}
        `,
      }}
    >
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-noise" />

      {/* Content */}
      <div className="relative p-4">
        {/* What's Next bubble - primary focus indicator */}
        {space.next && (
          <div className="mb-3 animate-fade-in" style={{ animationDelay: `${index * 50 + 80}ms` }}>
            <NextBubble text={space.next} color={accentColor} />
          </div>
        )}

        {/* Header: Icon + Name + Activity */}
        <div className="flex items-start gap-3 mb-3">
          <SpaceIcon space={space} hasActivity={hasActivity} />

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[15px] text-[--text-primary] truncate tracking-[-0.01em]">
              {space.name}
            </h3>
            {tabs && tabs.length > 0 && (
              <TabIconsRow tabs={tabs} max={5} />
            )}
          </div>

          {/* Activity indicator */}
          <div className="flex items-center gap-2 shrink-0">
            {hasActivity && <ActivityPulse color={accentColor} />}
            {space.agentCount > 0 && (
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase"
                style={{
                  background: `${accentColor}20`,
                  color: accentColor,
                }}
              >
                {space.agentCount} live
              </span>
            )}
          </div>
        </div>

        {/* Content area - Tasks or Notes preview */}
        <div className="min-h-[40px]">
          {space.contentMode === 'notes' && space.notesPreview ? (
            <NotesPreview text={space.notesPreview} />
          ) : space.tasks && space.tasks.length > 0 ? (
            <TasksPreview tasks={space.tasks.slice(0, 3)} color={accentColor} />
          ) : (
            <p className="text-[12px] text-[--text-tertiary] italic">
              No tasks yet
            </p>
          )}
        </div>

        {/* Footer - Tab count + chevron */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <TabDots count={space.tabCount} max={5} color={accentColor} />
            <span className="text-[11px] text-[--text-tertiary] font-medium">
              {space.tabCount} tab{space.tabCount !== 1 ? 's' : ''}
            </span>
          </div>
          <ChevronIcon className="w-4 h-4 text-[--text-tertiary] group-active:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// === LIST VARIANT ===
function ListCard({ space, hasActivity, index }: { space: SpaceInfo; hasActivity: boolean; index: number }) {
  const accentColor = space.color || '#f59e0b';

  return (
    <Link
      to={`/space/${space.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl backdrop-blur-xl transition-all duration-200 active:scale-[0.99]"
      style={{
        animationDelay: `${index * 40}ms`,
        borderLeft: `3px solid ${accentColor}`,
        background: `linear-gradient(90deg, ${accentColor}08 0%, transparent 30%), rgba(25, 25, 28, 0.75)`,
        boxShadow: `
          inset 0 1px 0 0 rgba(255,255,255,0.04),
          inset 0 0 0 1px rgba(255,255,255,0.06),
          0 4px 16px -4px rgba(0,0,0,0.4)
        `,
      }}
    >
      {/* Icon */}
      <SpaceIcon space={space} hasActivity={hasActivity} size="sm" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[14px] text-[--text-primary] truncate tracking-[-0.01em]">
            {space.name}
          </h3>
          {space.next && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded truncate max-w-[70px]"
              style={{
                background: `${accentColor}15`,
                color: accentColor,
              }}
            >
              {space.next}
            </span>
          )}
        </div>
        <p className="text-[12px] text-[--text-secondary] mt-0.5">
          {space.tabCount} tabs
          {space.agentCount > 0 && (
            <span style={{ color: accentColor }}> · {space.agentCount} active</span>
          )}
        </p>
      </div>

      {/* Activity + Chevron */}
      {hasActivity && <ActivityPulse color={accentColor} />}
      <ChevronIcon className="w-5 h-5 text-[--text-tertiary] shrink-0 group-active:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// === PANE VARIANT - Full interactive view (for carousel/standalone) ===
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
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const accentColor = space.color || '#f59e0b';

  return (
    <div
      className="h-full flex flex-col rounded-xl overflow-hidden backdrop-blur-xl"
      style={{
        borderLeft: `3px solid ${accentColor}`,
        background: `linear-gradient(180deg, ${accentColor}12 0%, rgba(25, 25, 28, 0.95) 40%, rgba(18, 17, 15, 0.98) 100%)`,
        boxShadow: `
          inset 0 1px 0 0 rgba(255,255,255,0.06),
          inset 0 0 0 1px rgba(255,255,255,0.08),
          0 12px 48px -12px rgba(0,0,0,0.6)
          ${hasActivity ? `, 0 0 40px -15px ${accentColor}40` : ''}
        `,
      }}
    >
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none bg-noise" />

      {/* Header */}
      <div className="relative p-5 border-b border-white/[0.06]">
        {/* Decorative glow */}
        <div
          className="absolute top-0 right-0 w-40 h-40 opacity-[0.1] blur-3xl pointer-events-none"
          style={{ background: accentColor }}
        />

        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <SpaceIcon space={space} hasActivity={hasActivity} size="lg" />
            <div>
              <h2 className="text-[18px] font-semibold text-[--text-primary] tracking-[-0.02em]">
                {space.name}
              </h2>
              <p className="text-[12px] text-[--text-secondary] mt-0.5">
                {space.tabCount} tabs · {space.agentCount} agent{space.agentCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActivity && <ActivityPulse color={accentColor} size="lg" />}
            <button
              onClick={() => setIsEditSheetOpen(true)}
              className="p-2.5 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <EditIcon className="w-4 h-4 text-[--text-tertiary]" />
            </button>
          </div>
        </div>

        {/* What's Next */}
        {space.next && (
          <NextBubble text={space.next} color={accentColor} variant="large" />
        )}
      </div>

      {/* Content - use shared component */}
      <SpaceContent
        space={space}
        tabs={tabs}
        onTaskToggle={onTaskToggle}
        onTaskCreate={onTaskCreate}
        onTabClose={onTabClose}
        onSpaceUpdate={onSpaceUpdate}
      />

      {/* Edit Sheet */}
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

// === SHARED CONTENT COMPONENT - Used in panes and full cards ===
export function SpaceContent({
  space,
  tabs,
  onTaskToggle,
  onTaskCreate,
  onSpaceUpdate,
}: {
  space: SpaceInfo & { notesContent?: string };
  tabs?: TabInfo[];
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  onTaskCreate?: (content: string) => void;
  onSpaceUpdate?: () => void;
}) {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const accentColor = space.color || '#f59e0b';

  const handleTaskToggle = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await tasksApi.toggle(space.id, taskId);
      onTaskToggle?.(taskId, completed);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  }, [space.id, onTaskToggle]);

  const handleCreateTask = useCallback(async () => {
    const content = newTaskContent.trim();
    if (!content) return;

    setIsCreatingTask(true);
    try {
      await tasksApi.create(space.id, content);
      setNewTaskContent('');
      onTaskCreate?.(content);
      onSpaceUpdate?.();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  }, [space.id, newTaskContent, onTaskCreate, onSpaceUpdate]);

  return (
    <>
      {/* Tabs Row - always show (with "+" button to add tabs) */}
      <TabsRow tabs={tabs || []} spaceId={space.id} />

      {/* Content - scrollable, min-h-0 allows flex shrinking */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {/* Task Creation Input - minimal styling */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreateTask(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            placeholder="Add a task..."
            disabled={isCreatingTask}
            className="flex-1 px-3 py-2 bg-transparent text-[14px] text-[--text-primary] placeholder:text-[--text-tertiary] border-b border-white/[0.06] focus:border-white/[0.15] outline-none transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newTaskContent.trim() || isCreatingTask}
            className="px-3 py-2 text-[14px] font-semibold transition-all active:scale-[0.96] disabled:opacity-40"
            style={{ color: accentColor }}
          >
            {isCreatingTask ? '...' : '+'}
          </button>
        </form>

        {/* Tasks Section */}
        {space.tasks && space.tasks.length > 0 && (
          <section className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <SectionHeader title="Tasks" count={space.tasks.length} />
            <TasksList tasks={space.tasks} onToggle={handleTaskToggle} color={accentColor} spaceId={space.id} />
          </section>
        )}

        {/* Notes Section - Always show editor */}
        <section className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <SectionHeader title="Notes" />
          <NotesEditor
            spaceId={space.id}
            initialContent={space.notesContent}
          />
        </section>

      </div>
    </>
  );
}

// === SUBCOMPONENTS ===

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[10px] font-bold text-[--text-tertiary] uppercase tracking-[0.08em]">
        {title}
      </h3>
      {count !== undefined && (
        <span className="text-[10px] text-[--text-tertiary]/60">{count}</span>
      )}
    </div>
  );
}

function NextBubble({ text, color, variant = 'compact' }: { text: string; color: string; variant?: 'compact' | 'large' }) {
  if (variant === 'large') {
    return (
      <div
        className="mt-3 p-4 rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${color}12, ${color}06)`,
          border: `1px solid ${color}20`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${color}20` }}
          >
            <span style={{ color }} className="text-[11px] font-bold">→</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[--text-tertiary] block mb-1">
              What's Next
            </span>
            <p className="text-[14px] font-medium leading-snug" style={{ color }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full"
      style={{
        background: `${color}18`,
        boxShadow: `0 0 12px ${color}10`,
      }}
    >
      <span style={{ color }} className="text-[8px] font-bold">→</span>
      <span className="text-[10px] font-semibold truncate max-w-[140px]" style={{ color }}>
        {text}
      </span>
    </div>
  );
}

function TasksPreview({ tasks, color }: { tasks: TaskItem[]; color: string }) {
  return (
    <div className="space-y-1.5">
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="flex items-center gap-2.5 animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <TaskCheckbox completed={task.completed} color={color} size="sm" />
          <span className={`text-[12px] truncate ${task.completed ? 'text-[--text-tertiary]/50 line-through' : 'text-[--text-secondary]'}`}>
            {task.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function TasksList({
  tasks,
  onToggle,
  color,
  spaceId,
}: {
  tasks: TaskItem[];
  onToggle?: (taskId: string, completed: boolean) => void;
  color: string;
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
          className="group flex items-center gap-3 p-3 rounded-lg transition-colors"
          style={{
            background: task.completed ? 'transparent' : 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            animationDelay: `${i * 30}ms`,
          }}
        >
          <button
            onClick={(e) => { e.preventDefault(); onToggle?.(task.id, !task.completed); }}
            className="flex items-center gap-3 flex-1 text-left active:scale-[0.99]"
          >
            <TaskCheckbox completed={task.completed} color={color} />
            <span className={`text-[14px] flex-1 ${task.completed ? 'text-[--text-tertiary]/50 line-through' : 'text-[--text-primary]'}`}>
              {task.text}
            </span>
          </button>
          {spaceId && (
            <button
              onClick={(e) => handleDelete(task.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md transition-all"
              style={{ background: 'rgba(239,68,68,0.1)' }}
            >
              <CloseIcon className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskCheckbox({ completed, color, size = 'md' }: { completed: boolean; color: string; size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const checkSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <span
      className={`${dimensions} rounded flex-shrink-0 flex items-center justify-center transition-all`}
      style={{
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: completed ? color : 'rgba(255,255,255,0.2)',
        background: completed ? `${color}20` : 'transparent',
        boxShadow: completed ? `0 0 8px ${color}30` : undefined,
      }}
    >
      {completed && (
        <svg className={checkSize} viewBox="0 0 12 12" fill="none" style={{ color }}>
          <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function NotesPreview({ text }: { text: string }) {
  return (
    <p className="text-[12px] text-[--text-secondary]/70 leading-relaxed line-clamp-2 italic">
      "{text}"
    </p>
  );
}

function TabIconsRow({ tabs, max }: { tabs: TabInfo[]; max: number }) {
  const visibleTabs = tabs.slice(0, max);
  const remaining = tabs.length - max;

  return (
    <div className="flex items-center gap-1 mt-1">
      {visibleTabs.map((tab, i) => (
        <TabIcon key={tab.id} tab={tab} style={{ animationDelay: `${i * 30}ms` }} />
      ))}
      {remaining > 0 && (
        <span className="text-[9px] text-[--text-tertiary] ml-0.5">+{remaining}</span>
      )}
    </div>
  );
}

function TabIcon({ tab, size = 'sm', style }: { tab: TabInfo; size?: 'sm' | 'md'; style?: React.CSSProperties }) {
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-[11px]';
  const iconMap: Record<string, string> = {
    terminal: '⬛',
    browser: '🌐',
    notes: '📝',
    tasks: '✓',
    'app-launcher': '📦',
  };

  return (
    <span
      className={`${sizeClass} rounded-lg flex items-center justify-center shrink-0 animate-fade-in`}
      style={{
        background: tab.appColor ? `${tab.appColor}20` : 'rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {tab.emoji || iconMap[tab.type] || '📄'}
    </span>
  );
}

function SpaceIcon({ space, hasActivity, size = 'md' }: { space: SpaceInfo; hasActivity?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm rounded-lg',
    md: 'w-10 h-10 text-base rounded-xl',
    lg: 'w-12 h-12 text-xl rounded-xl',
  };
  const accentColor = space.color || '#f59e0b';

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shrink-0 relative`}
      style={{
        background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)`,
        boxShadow: hasActivity
          ? `0 0 16px ${accentColor}25, 0 2px 8px rgba(0,0,0,0.2)`
          : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {space.icon || '📁'}
      {hasActivity && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
          style={{
            background: accentColor,
            border: '2px solid rgba(25,25,28,0.9)',
          }}
        />
      )}
    </div>
  );
}

function TabDots({ count, max, color }: { count: number; max: number; color: string }) {
  const filled = Math.min(count, max);
  const empty = max - filled;

  return (
    <div className="flex gap-1">
      {[...Array(filled)].map((_, i) => (
        <span
          key={`f-${i}`}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 4px ${color}40` }}
        />
      ))}
      {[...Array(empty)].map((_, i) => (
        <span key={`e-${i}`} className="w-1.5 h-1.5 rounded-full bg-white/[0.08]" />
      ))}
    </div>
  );
}

function ActivityPulse({ color, size = 'sm' }: { color: string; size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5';

  return (
    <span className={`relative flex ${dimensions} shrink-0`}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </span>
  );
}

// === ICONS ===

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
