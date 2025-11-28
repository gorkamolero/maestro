import { Hono } from 'hono';
import { getAgentMonitorService } from '../../agent-monitor';
import { getCachedSpaces } from '../../../ipc/space-sync';

export const spacesRouter = new Hono();
const agentMonitorService = getAgentMonitorService();

// List all spaces
spacesRouter.get('/', (c) => {
  const cachedSpaces = getCachedSpaces() as any[];
  const sessions = agentMonitorService.getSessions();
  
  // If we have cached spaces from renderer, use them
  if (cachedSpaces && cachedSpaces.length > 0) {
    const spaces = cachedSpaces.map(space => ({
      id: space.id,
      name: space.name,
      color: space.primaryColor, // Use primary color
      icon: space.icon,
      repoPath: space.connectedRepo?.path,
      lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
      tabCount: 0, // TODO: Need tab count sync too?
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
  const cachedSpaces = getCachedSpaces() as any[];
  
  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');

  const space = cachedSpaces?.find(s => s.id === id);

  if (space) {
    return c.json({
      id: space.id,
      name: space.name,
      color: space.primaryColor,
      icon: space.icon,
      repoPath: space.connectedRepo?.path,
      lastAccessedAt: space.lastActiveAt || new Date().toISOString(),
      tabs: [], // Tabs are not yet synced, but could be added to the cache payload
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
    tabs: [],
    agents: sessions,
  });
});

// Get agents for a space
spacesRouter.get('/:id/agents', (c) => {
  const id = c.req.param('id');
  
  const sessions = agentMonitorService.getSessions()
    .filter(s => s.spaceId === id && s.status !== 'ended');
  
  return c.json({ agents: sessions });
});