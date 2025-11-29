import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { useWorkspaceTasksStore, workspaceTasksActions, workspaceTasksComputed } from '@/stores/workspace-tasks.store';
import { browserStore } from '@/stores/browser.store';
import type { TaskItem } from '@shared/types';

export function SpaceSync() {
  const { spaces } = useSpacesStore();
  const { tabs } = useWorkspaceStore();
  const { tasks } = useWorkspaceTasksStore();
  const browserState = useSnapshot(browserStore);

  // Sync spaces to main process
  useEffect(() => {
    const payload = spaces.map(s => ({
      id: s.id,
      name: s.name,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      icon: s.icon,
      lastActiveAt: s.lastActiveAt,
      next: s.next,
      notesContent: s.notesContent,
      contentMode: s.contentMode,
      tags: s.tags ? [...s.tags] : undefined,
      isActive: s.isActive,
      connectedRepo: s.connectedRepo ? { ...s.connectedRepo } : undefined,
      tabs: tabs.filter(t => t.spaceId === s.id).map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        emoji: t.emoji,
        disabled: t.disabled,
        url: t.type === 'browser' ? browserState.browsers[t.id]?.url : undefined,
        terminalState: t.terminalState ? {
          buffer: t.terminalState.buffer,
          workingDir: t.terminalState.workingDir,
        } : undefined,
        appLauncherConfig: t.appLauncherConfig ? {
          icon: t.appLauncherConfig.icon,
          color: t.appLauncherConfig.color,
        } : undefined,
      })),
    }));

    window.electron.send('spaces:update', payload);
  }, [spaces, tabs, browserState]);

  // Sync tasks to main process
  useEffect(() => {
    // Group tasks by spaceId
    const tasksBySpace: Record<string, TaskItem[]> = {};

    for (const space of spaces) {
      const spaceTasks = workspaceTasksComputed.getTasksForSpace(space.id);
      tasksBySpace[space.id] = spaceTasks.map(t => ({
        id: t.id,
        text: t.content,
        completed: t.completed,
        createdAt: new Date(t.createdAt).toISOString(),
      }));
    }

    window.electron.send('tasks:update', tasksBySpace);
  }, [tasks, spaces]);

  // Listen for remote commands
  useEffect(() => {
    const cleanupFns: Array<() => void> = [];

    // === Tab Management ===

    cleanupFns.push(window.electron.on('spaces:create-tab', (data) => {
      const { spaceId, type } = data as { spaceId: string; type: string; url?: string };
      if (type === 'browser' || type === 'terminal' || type === 'notes' || type === 'agent') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workspaceActions.openTab(spaceId, type as any, type === 'browser' ? 'New Tab' : type, {});
      }
    }));

    cleanupFns.push(window.electron.on('spaces:create-terminal', (data) => {
      const { spaceId } = data as { spaceId: string };
      workspaceActions.openTab(spaceId, 'terminal', 'Terminal');
    }));

    cleanupFns.push(window.electron.on('spaces:close-tab', (data) => {
      const { tabId } = data as { tabId: string };
      workspaceActions.closeTab(tabId);
    }));

    // === Task Management ===

    cleanupFns.push(window.electron.on('tasks:toggle', (data) => {
      const { taskId } = data as { taskId: string };
      workspaceTasksActions.toggleTask(taskId);
    }));

    cleanupFns.push(window.electron.on('tasks:create', (data) => {
      const { spaceId, content } = data as { spaceId: string; content: string };
      workspaceTasksActions.addTask(spaceId, content);
    }));

    cleanupFns.push(window.electron.on('tasks:delete', (data) => {
      const { taskId } = data as { taskId: string };
      workspaceTasksActions.deleteTask(taskId);
    }));

    cleanupFns.push(window.electron.on('tasks:update-content', (data) => {
      const { taskId, content } = data as { taskId: string; content: string };
      workspaceTasksActions.updateTaskContent(taskId, content);
    }));

    // === Space Management ===

    cleanupFns.push(window.electron.on('spaces:update-space', (data) => {
      const { spaceId, updates } = data as {
        spaceId: string;
        updates: {
          name?: string;
          primaryColor?: string;
          secondaryColor?: string;
          icon?: string;
          next?: string | null;
          isActive?: boolean;
        };
      };
      spacesActions.updateSpace(spaceId, updates);
    }));

    cleanupFns.push(window.electron.on('spaces:set-next', (data) => {
      const { spaceId, next } = data as { spaceId: string; next: string | null };
      spacesActions.setSpaceNext(spaceId, next);
    }));

    cleanupFns.push(window.electron.on('spaces:set-notes-content', (data) => {
      const { spaceId, content } = data as { spaceId: string; content: string };
      spacesActions.setSpaceNotesContent(spaceId, content);
    }));

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, []);

  return null;
}
