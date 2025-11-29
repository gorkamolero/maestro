import { Hono } from 'hono';
import { getAgentMonitorService } from '../../agent-monitor';
import {
  getCachedSpaces,
  getCachedTasks,
  requestCreateTab,
  requestCreateTerminal,
  requestCloseTab,
  requestToggleTask,
  requestCreateTask,
  requestDeleteTask,
  requestUpdateTask,
  requestUpdateSpace,
  requestSetSpaceNext,
  requestSetSpaceNotesContent,
  type SpaceUpdate,
} from '../../../ipc/space-sync';

export const spacesRouter = new Hono();
const agentMonitorService = getAgentMonitorService();

// Valid tab types for creation
const VALID_TAB_TYPES = ['terminal', 'browser', 'notes', 'agent', 'app-launcher', 'tasks'] as const;

// Validate UUID format (basic check)
function isValidUUID(id: string): boolean {
  return typeof id === 'string' && id.length >= 8 && id.length <= 64;
}

// Lexical editor node structure
interface LexicalNode {
  text?: string;
  children?: LexicalNode[];
}

// Walk a Lexical node tree to extract text
function extractTextFromNode(node: LexicalNode, textParts: string[]): void {
  if (node.text) {
    textParts.push(node.text);
  }
  if (node.children) {
    for (const child of node.children) {
      extractTextFromNode(child, textParts);
    }
  }
}

// Extract plain text preview from Lexical JSON content
function extractNotesPreview(notesContent: string | undefined, maxLength = 100): string | undefined {
  if (!notesContent) return undefined;

  try {
    const parsed = JSON.parse(notesContent);
    const textParts: string[] = [];

    extractTextFromNode(parsed.root || parsed, textParts);
    const fullText = textParts.join(' ').trim();

    if (fullText.length <= maxLength) return fullText || undefined;
    return fullText.substring(0, maxLength) + '...';
  } catch {
    return undefined;
  }
}

// List all spaces
spacesRouter.get('/', (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSpaces = getCachedSpaces() as any[];
  const cachedTasks = getCachedTasks();
  const sessions = agentMonitorService.getSessions();

  // If we have cached spaces from renderer, use them
  if (cachedSpaces && cachedSpaces.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spaces = cachedSpaces.map((space: any) => {
      const spaceTasks = cachedTasks[space.id] || [];
      return {
        id: space.id,
        name: space.name,
        color: space.primaryColor,
        secondaryColor: space.secondaryColor,
        icon: space.icon,
        repoPath: space.connectedRepo?.path,
        lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
        tabCount: space.tabs?.length || 0,
        agentCount: sessions.filter(s => s.spaceId === space.id).length,
        // Enhanced fields
        next: space.next || null,
        tasks: spaceTasks.slice(0, 5), // First 5 tasks for preview
        notesPreview: extractNotesPreview(space.notesContent),
        contentMode: space.contentMode || 'tasks',
        tags: space.tags || [],
        isActive: space.isActive !== false,
      };
    });
    return c.json({ spaces });
  }

  // Fallback to inferred spaces
  const spaceIds = new Set(sessions.map(s => s.spaceId).filter(Boolean));

  const spaces = Array.from(spaceIds).map(id => ({
    id,
    name: `Space ${id?.slice(0, 4)}`,
    color: undefined,
    secondaryColor: undefined,
    icon: undefined,
    repoPath: undefined,
    lastAccessedAt: new Date().toISOString(),
    tabCount: 0,
    agentCount: sessions.filter(s => s.spaceId === id).length,
    next: null,
    tasks: [],
    notesPreview: undefined,
    contentMode: 'tasks' as const,
    tags: [],
    isActive: true,
  }));

  return c.json({ spaces });
});

// Get single space with tabs
spacesRouter.get('/:id', (c) => {
  const id = c.req.param('id');

  // Validate space ID format
  if (!isValidUUID(id)) {
    return c.json({ error: 'invalid_space_id' }, 400);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSpaces = getCachedSpaces() as any[];
  const cachedTasks = getCachedTasks();

  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const space = cachedSpaces?.find((s: any) => s.id === id);

  if (space) {
    const spaceTasks = cachedTasks[space.id] || [];
    return c.json({
      id: space.id,
      name: space.name,
      color: space.primaryColor,
      secondaryColor: space.secondaryColor,
      icon: space.icon,
      repoPath: space.connectedRepo?.path,
      lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
      tabCount: space.tabs?.length || 0,
      agentCount: sessions.length,
      // Enhanced fields
      next: space.next || null,
      tasks: spaceTasks,
      notesPreview: extractNotesPreview(space.notesContent),
      notesContent: space.notesContent,
      contentMode: space.contentMode || 'tasks',
      tags: space.tags || [],
      isActive: space.isActive !== false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabs: space.tabs?.map((t: any) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        url: t.url,
        emoji: t.emoji,
        terminalId: t.terminalState ? t.id : undefined,
        content: t.notesContent,
        disabled: t.disabled,
        hasTerminalBuffer: !!t.terminalState?.buffer,
        workingDir: t.terminalState?.workingDir,
        appIcon: t.appLauncherConfig?.icon,
        appColor: t.appLauncherConfig?.color,
      })) || [],
      agents: sessions,
    });
  }

  return c.json({
    id,
    name: `Space ${id.slice(0, 4)}`,
    color: undefined,
    secondaryColor: undefined,
    icon: undefined,
    repoPath: undefined,
    lastAccessedAt: new Date().toISOString(),
    tabCount: 0,
    agentCount: sessions.length,
    next: null,
    tasks: [],
    notesPreview: undefined,
    notesContent: undefined,
    contentMode: 'tasks' as const,
    tags: [],
    isActive: true,
    tabs: [],
    agents: sessions,
  });
});

// Create terminal in space
spacesRouter.post('/:id/terminals', async (c) => {
  const spaceId = c.req.param('id');
  requestCreateTerminal(spaceId);
  // Return success - creation is async via IPC
  return c.json({ success: true });
});

// Create tab in space
spacesRouter.post('/:id/tabs', async (c) => {
  const spaceId = c.req.param('id');

  if (!isValidUUID(spaceId)) {
    return c.json({ error: 'invalid_space_id' }, 400);
  }

  const body = await c.req.json() as { type?: string; url?: string };

  // Validate tab type
  if (!body.type || !VALID_TAB_TYPES.includes(body.type as typeof VALID_TAB_TYPES[number])) {
    return c.json({ error: 'invalid_tab_type', valid: VALID_TAB_TYPES }, 400);
  }

  // Validate URL if provided for browser tabs
  if (body.type === 'browser' && body.url) {
    try {
      new URL(body.url);
    } catch {
      return c.json({ error: 'invalid_url' }, 400);
    }
  }

  requestCreateTab(spaceId, body.type, body.url);
  return c.json({ success: true });
});

// Get agents for a space
spacesRouter.get('/:id/agents', (c) => {
  const id = c.req.param('id');

  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');

  return c.json({ agents: sessions });
});

// === Space Editing ===

// Update space properties (name, color, icon, etc.)
spacesRouter.patch('/:id', async (c) => {
  const spaceId = c.req.param('id');
  const body = await c.req.json() as SpaceUpdate;

  requestUpdateSpace(spaceId, body);
  return c.json({ success: true });
});

// Set "What's Next" for a space
spacesRouter.put('/:id/next', async (c) => {
  const spaceId = c.req.param('id');
  const { next } = await c.req.json() as { next: string | null };

  requestSetSpaceNext(spaceId, next);
  return c.json({ success: true });
});

// === Task Management ===

// Create a new task
spacesRouter.post('/:id/tasks', async (c) => {
  const spaceId = c.req.param('id');
  const { content } = await c.req.json() as { content: string };

  if (!content?.trim()) {
    return c.json({ error: 'content_required' }, 400);
  }

  requestCreateTask(spaceId, content.trim());
  return c.json({ success: true });
});

// Toggle task completion
spacesRouter.post('/:id/tasks/:taskId/toggle', async (c) => {
  const taskId = c.req.param('taskId');

  requestToggleTask(taskId);
  return c.json({ success: true });
});

// Update task content
spacesRouter.patch('/:id/tasks/:taskId', async (c) => {
  const taskId = c.req.param('taskId');
  const { content } = await c.req.json() as { content: string };

  if (!content?.trim()) {
    return c.json({ error: 'content_required' }, 400);
  }

  requestUpdateTask(taskId, content.trim());
  return c.json({ success: true });
});

// Delete a task
spacesRouter.delete('/:id/tasks/:taskId', async (c) => {
  const taskId = c.req.param('taskId');

  requestDeleteTask(taskId);
  return c.json({ success: true });
});

// === Tab Management ===

// Close a tab
spacesRouter.delete('/:id/tabs/:tabId', async (c) => {
  const tabId = c.req.param('tabId');

  requestCloseTab(tabId);
  return c.json({ success: true });
});

// === Notes Management ===

// Get notes content for a space
spacesRouter.get('/:id/notes', (c) => {
  const id = c.req.param('id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSpaces = getCachedSpaces() as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const space = cachedSpaces?.find((s: any) => s.id === id);

  return c.json({
    notesContent: space?.notesContent || null,
  });
});

// Update notes content
spacesRouter.put('/:id/notes', async (c) => {
  const spaceId = c.req.param('id');
  const { content } = await c.req.json() as { content: string };

  requestSetSpaceNotesContent(spaceId, content);
  return c.json({ success: true });
});