// Agent Monitor Service
// Coordinates with utility process for file watching and manages process detection

import { EventEmitter } from 'events';
import { resolve, join } from 'path';
import { app, BrowserWindow, utilityProcess, UtilityProcess, Notification } from 'electron';
import { ProcessScanner } from './process-scanner';
import { AgentRegistry } from './registry';

// Agent type display names for notifications
const AGENT_TYPE_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
};
import type {
  AgentSession,
  AgentActivity,
  AgentType,
  ConnectedRepo,
  DetectedProcess,
} from '@/types/agent-events';

// Re-export types and channels
export * from '@/types/agent-events';

interface AgentMonitorServiceEvents {
  'session:created': AgentSession;
  'session:updated': AgentSession;
  'session:ended': AgentSession;
  'activity:new': AgentActivity;
  'process:detected': DetectedProcess;
  'process:exited': { pid: number; agentType: AgentType };
  error: { error: Error; context: string };
}

export interface AgentMonitorService {
  on<K extends keyof AgentMonitorServiceEvents>(
    event: K,
    listener: (data: AgentMonitorServiceEvents[K]) => void
  ): this;
  emit<K extends keyof AgentMonitorServiceEvents>(event: K, data: AgentMonitorServiceEvents[K]): boolean;
}

export class AgentMonitorService extends EventEmitter {
  private worker: UtilityProcess | null = null;
  private processScanner: ProcessScanner;
  private registry: AgentRegistry;
  private mainWindow: BrowserWindow | null = null;

  private processSessionMap: Map<number, string> = new Map(); // pid -> sessionId
  private lastProcesses: DetectedProcess[] = [];
  private workerReady = false;
  private pendingMessages: Array<{ type: string; payload?: unknown }> = [];

  // Track previous session status to detect transitions to needs_input
  private previousSessionStatus: Map<string, string> = new Map();

  private pruneInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_SCAN_INTERVAL_MS = 5000; // 5 seconds
  private readonly PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this.processScanner = new ProcessScanner();
    this.registry = new AgentRegistry();

    this.setupRegistryEventForwarding();
  }

  private setupRegistryEventForwarding(): void {
    // Forward registry events to renderer
    this.registry.on('session:created', (session) => {
      this.emit('session:created', session);
      this.sendToRenderer('agent-monitor:session-created', session);
    });

    this.registry.on('session:updated', (session) => {
      this.emit('session:updated', session);
      this.sendToRenderer('agent-monitor:session-updated', session);
    });

    this.registry.on('session:ended', (session) => {
      this.emit('session:ended', session);
      this.sendToRenderer('agent-monitor:session-ended', session);

      // Clean up processSessionMap to prevent memory leak
      for (const [pid, sessionId] of this.processSessionMap.entries()) {
        if (sessionId === session.id) {
          this.processSessionMap.delete(pid);
          break;
        }
      }

      // Clean up previousSessionStatus to prevent memory leak
      this.previousSessionStatus.delete(session.id);
    });

    this.registry.on('activity:new', (activity) => {
      this.emit('activity:new', activity);
      this.sendToRenderer('agent-monitor:activity-new', activity);
    });
  }

  private sendToRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  private sendToWorker(type: string, payload?: unknown): void {
    const message = { type, payload };

    if (!this.workerReady) {
      this.pendingMessages.push(message);
      return;
    }

    this.worker?.postMessage(message);
  }

  /**
   * Show a system notification when an agent needs user input
   */
  private showNeedsInputNotification(session: AgentSession): void {
    // Don't notify if window is focused
    if (this.mainWindow && this.mainWindow.isFocused()) {
      return;
    }

    const agentName = AGENT_TYPE_NAMES[session.agentType] || session.agentType;
    const projectName = session.projectPath.split('/').pop() || 'Unknown';

    const notification = new Notification({
      title: `${agentName} needs input`,
      body: `Agent in ${projectName} is waiting for your response`,
      silent: false, // Play system sound
    });

    // Click notification to focus window and open vault to this agent
    notification.on('click', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.focus();

        // Send message to renderer to open vault to this agent
        this.sendToRenderer('agent-monitor:focus-agent', {
          sessionId: session.id,
          tabId: session.terminalTabId,
          spaceId: session.spaceId,
        });
      }
    });

    notification.show();
  }

  private handleWorkerMessage(message: { type: string; payload?: unknown }): void {
    switch (message.type) {
      case 'ready':
        console.log('[AgentMonitorService] Worker ready, sending start command');
        // Worker is ready to receive messages, now we can send commands
        this.workerReady = true;
        // Send any pending messages (including the 'start' command)
        for (const msg of this.pendingMessages) {
          this.worker?.postMessage(msg);
        }
        this.pendingMessages = [];
        break;

      case 'started':
        console.log('[AgentMonitorService] Worker started watching files');
        break;

      case 'stopped':
        console.log('[AgentMonitorService] Worker stopped');
        this.workerReady = false;
        break;

      case 'session:created': {
        const session = message.payload as AgentSession;
        this.registry.importSession(session);
        this.emit('session:created', session);
        this.sendToRenderer('agent-monitor:session-created', session);
        break;
      }

      case 'session:updated': {
        const session = message.payload as AgentSession;
        const previousStatus = this.previousSessionStatus.get(session.id);

        // Check if status changed to needs_input
        if (session.status === 'needs_input' && previousStatus !== 'needs_input') {
          this.showNeedsInputNotification(session);
        }

        // Update previous status
        this.previousSessionStatus.set(session.id, session.status);

        this.registry.importSession(session);
        this.emit('session:updated', session);
        this.sendToRenderer('agent-monitor:session-updated', session);
        break;
      }

      case 'activity:new': {
        const activity = message.payload as AgentActivity;
        this.registry.addActivity(activity);
        // addActivity already emits 'activity:new' via registry event forwarding
        break;
      }

      case 'sessions':
        // Response to get-sessions query - handled by caller
        break;

      case 'activities':
        // Response to get-activities query - handled by caller
        break;

      case 'repo-connected':
        console.log('[AgentMonitorService] Repo connected:', message.payload);
        break;

      case 'repo-disconnected':
        console.log('[AgentMonitorService] Repo disconnected:', message.payload);
        break;

      default:
        console.warn(`[AgentMonitorService] Unknown worker message: ${message.type}`);
    }
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(mainWindow?: BrowserWindow): Promise<void> {
    console.log('[AgentMonitorService] Starting...');

    if (mainWindow) {
      this.mainWindow = mainWindow;
    }

    // Start utility process for file watching
    await this.startWorker();

    // Start process scanning (lightweight, stays on main)
    this.processScanner.startPolling(this.PROCESS_SCAN_INTERVAL_MS, this.handleProcessScan.bind(this));

    // Start periodic pruning
    this.pruneInterval = setInterval(() => {
      this.registry.pruneOldSessions(this.SESSION_MAX_AGE_MS);
    }, this.PRUNE_INTERVAL_MS);

    console.log('[AgentMonitorService] Started');
  }

  private async startWorker(): Promise<void> {
    // Get the path to the worker script
    // In development, it's in .vite/build, in production it's in resources
    const workerPath = app.isPackaged
      ? join(process.resourcesPath, 'app.asar', '.vite', 'build', 'worker.js')
      : join(app.getAppPath(), '.vite', 'build', 'worker.js');

    console.log('[AgentMonitorService] Starting worker from:', workerPath);

    try {
      this.worker = utilityProcess.fork(workerPath);

      this.worker.on('message', (message) => {
        this.handleWorkerMessage(message as { type: string; payload?: unknown });
      });

      this.worker.on('exit', (code) => {
        console.log(`[AgentMonitorService] Worker exited with code ${code}`);
        this.workerReady = false;
        this.worker = null;

        // Restart worker if it crashed unexpectedly
        if (code !== 0) {
          console.log('[AgentMonitorService] Restarting worker after crash...');
          setTimeout(() => this.startWorker(), 1000);
        }
      });

      // Tell worker to start watching
      this.sendToWorker('start');

      // Re-connect any saved repos
      for (const repo of this.registry.getConnectedRepos()) {
        this.sendToWorker('connect-repo', {
          path: repo.path,
          absolutePath: repo.absolutePath,
          spaceId: repo.spaceId,
        });
      }
    } catch (error) {
      console.error('[AgentMonitorService] Failed to start worker:', error);
      // Fall back to no file watching - process scanning still works
    }
  }

  async stop(): Promise<void> {
    console.log('[AgentMonitorService] Stopping...');

    // Stop worker
    if (this.worker) {
      this.sendToWorker('stop');
      this.worker.kill();
      this.worker = null;
    }

    this.processScanner.stopPolling();

    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }

    // Clear maps to prevent memory leaks
    this.processSessionMap.clear();
    this.lastProcesses = [];
    this.pendingMessages = [];
    this.workerReady = false;

    console.log('[AgentMonitorService] Stopped');
  }

  setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
  }

  // ============================================
  // REPO MANAGEMENT (Public API)
  // ============================================

  connectRepo(path: string, spaceId: string, options: Partial<ConnectedRepo> = {}): void {
    const absolutePath = resolve(path);

    // Save to registry
    this.registry.connectRepo({
      path,
      absolutePath,
      spaceId,
      monitoringEnabled: true,
      autoCreateSegments: true,
      ...options,
    });

    // Tell worker to watch this repo
    this.sendToWorker('connect-repo', { path, absolutePath, spaceId });
  }

  disconnectRepo(path: string): void {
    const absolutePath = resolve(path);
    this.registry.disconnectRepo(absolutePath);
    this.sendToWorker('disconnect-repo', { absolutePath });
  }

  getConnectedRepos(): ConnectedRepo[] {
    return this.registry.getConnectedRepos();
  }

  // ============================================
  // DATA ACCESS (Public API)
  // ============================================

  getSessions(): AgentSession[] {
    return this.registry.getAllSessions();
  }

  getActiveSessions(): AgentSession[] {
    return this.registry.getActiveSessions();
  }

  getSession(sessionId: string): AgentSession | undefined {
    return this.registry.getSession(sessionId);
  }

  getSessionsForSpace(spaceId: string): AgentSession[] {
    const sessions: AgentSession[] = [];

    for (const session of this.registry.getAllSessions()) {
      const repo = this.registry.getConnectedRepoForPath(session.projectPath);
      if (repo && repo.spaceId === spaceId) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  getActivitiesForSession(sessionId: string, limit?: number): AgentActivity[] {
    return this.registry.getActivitiesForSession(sessionId, limit);
  }

  getRecentActivities(limit?: number): AgentActivity[] {
    return this.registry.getRecentActivities(limit);
  }

  getActivitiesForSpace(spaceId: string, limit = 100): AgentActivity[] {
    const sessions = this.getSessionsForSpace(spaceId);
    const sessionIds = new Set(sessions.map((s) => s.id));

    return this.registry
      .getRecentActivities(limit * 2)
      .filter((a) => sessionIds.has(a.sessionId))
      .slice(-limit);
  }

  getStats() {
    return this.registry.getStats();
  }

  // ============================================
  // PENDING TAB REGISTRATION (for Jump to Terminal)
  // ============================================

  /**
   * Register a pending agent tab. Called when launching an agent from the UI.
   * The worker will match this to a session when the agent starts.
   */
  registerPendingAgentTab(tabId: string, spaceId: string, repoPath: string): void {
    this.sendToWorker('register-pending-tab', {
      tabId,
      spaceId,
      repoPath,
      launchedAt: Date.now(),
    });
  }

  // ============================================
  // PROCESS EVENT HANDLERS
  // ============================================

  private handleProcessScan(processes: DetectedProcess[]): void {
    const currentPids = new Set(processes.map((p) => p.pid));
    const previousPids = new Set(this.lastProcesses.map((p) => p.pid));

    // Check for new processes
    for (const proc of processes) {
      if (!previousPids.has(proc.pid)) {
        console.log(`[AgentMonitorService] New ${proc.agentType} process: PID ${proc.pid}`);
        this.emit('process:detected', proc);

        // Try to match with existing session by CWD
        if (proc.cwd && proc.agentType) {
          for (const session of this.registry.getSessionsForRepo(proc.cwd)) {
            if (session.agentType === proc.agentType && !session.processId) {
              this.registry.updateSession(session.id, { processId: proc.pid });
              this.processSessionMap.set(proc.pid, session.id);
              break;
            }
          }
        }
      }
    }

    // Check for exited processes
    for (const proc of this.lastProcesses) {
      if (!currentPids.has(proc.pid)) {
        console.log(`[AgentMonitorService] ${proc.agentType} process exited: PID ${proc.pid}`);
        const agentType = proc.agentType ?? 'claude-code';
        this.emit('process:exited', { pid: proc.pid, agentType });

        // Update associated session
        const sessionId = this.processSessionMap.get(proc.pid);
        if (sessionId) {
          this.registry.endSession(sessionId, 'process_exit');
          this.processSessionMap.delete(proc.pid);
        }
      }
    }

    this.lastProcesses = processes;
  }
}

// Singleton for main process
let serviceInstance: AgentMonitorService | null = null;

export function getAgentMonitorService(): AgentMonitorService {
  if (!serviceInstance) {
    serviceInstance = new AgentMonitorService();
  }
  return serviceInstance;
}
