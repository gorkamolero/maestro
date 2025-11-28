import { Hono } from 'hono';
import { getAgentMonitorService } from '../../agent-monitor';
import { getCachedSpaces, requestCreateTab, requestCreateTerminal } from '../../../ipc/space-sync';

export const spacesRouter = new Hono();
const agentMonitorService = getAgentMonitorService();

// List all spaces
spacesRouter.get('/', (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSpaces = getCachedSpaces() as any[];
  const sessions = agentMonitorService.getSessions();
  
  // If we have cached spaces from renderer, use them
  if (cachedSpaces && cachedSpaces.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spaces = cachedSpaces.map((space: any) => ({
      id: space.id,
      name: space.name,
      color: space.primaryColor, // Use primary color
      icon: space.icon,
      repoPath: space.connectedRepo?.path,
      lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
      tabCount: space.tabs?.length || 0,
      agentCount: sessions.filter(s => s.spaceId === space.id).length,
    }));
    return c.json({ spaces });
  }

  // Fallback to inferred spaces
  const spaceIds = new Set(sessions.map(s => s.spaceId).filter(Boolean));
  
  const spaces = Array.from(spaceIds).map(id => ({
    id,
    name: `Space ${id?.slice(0, 4)}`, // Placeholder
    color: undefined,
    icon: undefined,
    repoPath: undefined,
    lastAccessedAt: new Date().toISOString(),
    tabCount: 0,
    agentCount: sessions.filter(s => s.spaceId === id).length,
  }));
  
  return c.json({ spaces });
});

// Get single space with tabs
spacesRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedSpaces = getCachedSpaces() as any[];
  
  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const space = cachedSpaces?.find((s: any) => s.id === id);

  if (space) {
    return c.json({
      id: space.id,
      name: space.name,
      color: space.primaryColor,
      icon: space.icon,
      repoPath: space.connectedRepo?.path,
      lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
      tabCount: space.tabs?.length || 0,
      agentCount: sessions.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabs: space.tabs?.map((t: any) => ({
        id: t.id,
        type: t.type,
        title: t.title,
        url: t.url,
        terminalId: t.terminalState ? t.id : undefined, // Use tab ID as terminal ID for mapped PTYs
        content: t.notesContent, // Assuming notes content might be here or in separate field
      })) || [],
      agents: sessions,
    });
  }

  return c.json({
    id,
    name: `Space ${id.slice(0, 4)}`, // Placeholder
    color: undefined,
    icon: undefined,
    repoPath: undefined,
    lastAccessedAt: new Date().toISOString(),
    tabCount: 0,
    agentCount: sessions.length,
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
  const body = await c.req.json();
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