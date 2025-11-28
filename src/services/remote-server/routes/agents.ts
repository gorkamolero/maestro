import { Hono } from 'hono';
import { getAgentMonitorService } from '../../agent-monitor';
import { terminalBridge } from '../terminal/bridge';

export const agentsRouter = new Hono();
const agentMonitorService = getAgentMonitorService();

// List all active agent sessions
agentsRouter.get('/', (c) => {
  const sessions = agentMonitorService.getSessions();
  
  const agents = sessions
    .filter(s => s.status !== 'ended')
    .map(s => ({
      id: s.id,
      type: s.agentType,
      status: s.status,
      projectPath: s.projectPath,
      projectName: s.projectPath.split('/').pop(),
      spaceId: s.spaceId,
      spaceName: undefined, // TODO: Resolve space name
      terminalId: s.source === 'maestro-pty' ? s.id : s.terminalTabId,
      launchMode: 'local', // Default to local for now
      startedAt: new Date(s.startedAt).toISOString(), // Ensure ISO string
      lastActivityAt: new Date(s.lastActivityAt).toISOString(),
      stats: s.stats,
    }));
  
  return c.json({ agents });
});

// Get single agent
agentsRouter.get('/:id', (c) => {
  const id = c.req.param('id');
  const session = agentMonitorService.getSession(id);
  
  if (!session) {
    return c.json({ error: 'not_found' }, 404);
  }
  
  return c.json({
    id: session.id,
    type: session.agentType,
    status: session.status,
    projectPath: session.projectPath,
    projectName: session.projectPath.split('/').pop(),
    spaceId: session.spaceId,
    spaceName: undefined,
    terminalId: session.source === 'maestro-pty' ? session.id : session.terminalTabId,
    launchMode: 'local',
    startedAt: new Date(session.startedAt).toISOString(),
    lastActivityAt: new Date(session.lastActivityAt).toISOString(),
    stats: session.stats,
  });
});

// Get agent activities
agentsRouter.get('/:id/activities', (c) => {
  const id = c.req.param('id');
  const limitStr = c.req.query('limit');
  const limit = limitStr ? parseInt(limitStr) : 50;
  
  const activities = agentMonitorService.getActivitiesForSession(id, limit);
  
  return c.json({ activities });
});

// Send input to agent terminal
agentsRouter.post('/:id/input', async (c) => {
  const id = c.req.param('id');
  const { text } = await c.req.json<{ text: string }>();
  
  const session = agentMonitorService.getSession(id);
  if (!session?.terminalTabId) {
    return c.json({ error: 'no_terminal' }, 400);
  }
  
  terminalBridge.write(session.terminalTabId, text);
  
  return c.json({ success: true });
});

import { BrowserWindow } from 'electron';

import { agentPtyService } from '../../agent-pty.service';



// Launch new agent

agentsRouter.post('/launch', async (c) => {

    const { projectPath, mode = 'local' } = await c.req.json<{

      projectPath: string;

      mode: 'local' | 'mobile';

    }>();

  

  // Validate input

  if (!projectPath) {

    return c.json({ error: 'missing_project_path' }, 400);

  }



  // Generate session ID

  const sessionId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  

  // We need a BrowserWindow to attach to, but for headless/remote launch we might not have a specific one focused.

  // Use the main window if available.

  const windows = BrowserWindow.getAllWindows();

  const mainWindow = windows[0];

  

  if (!mainWindow) {

    return c.json({ error: 'no_window_available' }, 500);

  }



  try {

    // Start the session using AgentPtyService

    // This handles PTY spawning, Happy Coder/Claude selection, and status events

    await agentPtyService.startSession({

      sessionId,

      workDir: projectPath,

      prompt: '', // No initial prompt, just start the shell

      permissionMode: 'askUser',

      window: mainWindow,

      useHappy: mode === 'mobile', // Use Happy Coder if mobile mode

      happySettings: {

        trackName: 'Mobile Launch',

        trackIcon: '📱',

      }

    });



    // Note: We don't need to register with agentMonitor explicitly here.

    // agentMonitor watches for file changes or process table.

    // However, AgentPtyService spawns a process.

    // The `agent-monitor` service will eventually detect the process or the `agent-monitor` logic 

    // in `AgentPtyService` (if any) might handle it. 

    // Actually `AgentPtyService` emits `agent:status` which renderer hears.

    // `agent-monitor` service listens to `process:detected` via `ProcessScanner`.

    

    return c.json({

      success: true,

      terminalId: sessionId, // For PTY service, terminal ID is the session ID

      sessionId,

    });

  } catch (err) {

    const errorMessage = err instanceof Error ? err.message : 'launch_failed';
    console.error('[RemoteServer] Failed to launch agent:', err);

    return c.json({ error: errorMessage }, 500);

  }

});
