// Agent Monitor Service
// Main service that coordinates file watching, parsing, and process detection

import { EventEmitter } from 'events';
import { resolve } from 'path';
import { BrowserWindow } from 'electron';
import { AgentFileWatcher } from './file-watcher';
import { ProcessScanner } from './process-scanner';
import { AgentRegistry } from './registry';
import {
  parseClaudeCodeLine,
  extractClaudeCodeSessionMeta,
  parseCodexLine,
  extractCodexSessionMeta,
  parseGeminiCheckpoint,
  extractGeminiSessionMeta,
} from './parsers';
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
  private fileWatcher: AgentFileWatcher;
  private processScanner: ProcessScanner;
  private registry: AgentRegistry;
  private mainWindow: BrowserWindow | null = null;

  private fileSessionMap: Map<string, string> = new Map(); // filePath -> sessionId
  private processSessionMap: Map<number, string> = new Map(); // pid -> sessionId
  private lastProcesses: DetectedProcess[] = [];

  private idleCheckInterval: NodeJS.Timeout | null = null;
  private pruneInterval: NodeJS.Timeout | null = null;
  private readonly IDLE_THRESHOLD_MS = 30000; // 30 seconds without activity = idle
  private readonly PROCESS_SCAN_INTERVAL_MS = 5000; // 5 seconds
  private readonly PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this.fileWatcher = new AgentFileWatcher();
    this.processScanner = new ProcessScanner();
    this.registry = new AgentRegistry();

    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    // Forward registry events
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
      // Find and remove any process mapping for this ended session
      for (const [pid, sessionId] of this.processSessionMap.entries()) {
        if (sessionId === session.id) {
          this.processSessionMap.delete(pid);
          break;
        }
      }
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

  // ============================================
  // LIFECYCLE
  // ============================================

  async start(mainWindow?: BrowserWindow): Promise<void> {
    console.log('[AgentMonitorService] Starting...');

    if (mainWindow) {
      this.mainWindow = mainWindow;
    }

    // Start file watcher
    this.fileWatcher.on('file:created', this.handleFileCreated.bind(this));
    this.fileWatcher.on('file:changed', this.handleFileChanged.bind(this));
    this.fileWatcher.on('file:deleted', this.handleFileDeleted.bind(this));
    this.fileWatcher.on('error', ({ error, context }) => {
      console.error(`[AgentMonitorService] File watcher error:`, error, context);
      this.emit('error', { error, context });
    });

    try {
      await this.fileWatcher.start();
    } catch (error) {
      console.error('[AgentMonitorService] Failed to start file watcher:', error);
      // Continue anyway - process scanning can still work
    }

    // Start process scanning
    this.processScanner.startPolling(this.PROCESS_SCAN_INTERVAL_MS, this.handleProcessScan.bind(this));

    // Start idle detection
    this.idleCheckInterval = setInterval(() => {
      this.checkForIdleSessions();
    }, 10000); // Check every 10 seconds

    // Start periodic pruning
    this.pruneInterval = setInterval(() => {
      this.registry.pruneOldSessions(this.SESSION_MAX_AGE_MS);
    }, this.PRUNE_INTERVAL_MS);

    console.log('[AgentMonitorService] Started');
  }

  async stop(): Promise<void> {
    console.log('[AgentMonitorService] Stopping...');

    await this.fileWatcher.stop();
    this.processScanner.stopPolling();

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }

    // Clear all maps to prevent memory leaks
    this.fileSessionMap.clear();
    this.processSessionMap.clear();
    this.lastProcesses = [];

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
    this.registry.connectRepo({
      path,
      absolutePath,
      spaceId,
      monitoringEnabled: true,
      autoCreateSegments: true,
      ...options,
    });
  }

  disconnectRepo(path: string): void {
    const absolutePath = resolve(path);
    this.registry.disconnectRepo(absolutePath);
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
    // Find repos connected to this space
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
      .getRecentActivities(limit * 2) // Get more to filter
      .filter((a) => sessionIds.has(a.sessionId))
      .slice(-limit);
  }

  getStats() {
    return this.registry.getStats();
  }

  // ============================================
  // FILE EVENT HANDLERS
  // ============================================

  private handleFileCreated({
    agentType,
    filePath,
  }: {
    agentType: AgentType;
    filePath: string;
  }): void {
    console.log(`[AgentMonitorService] New ${agentType} file: ${filePath}`);
    // The file:changed event will handle parsing
  }

  private handleFileChanged({
    agentType,
    filePath,
    newContent,
  }: {
    agentType: AgentType;
    filePath: string;
    newContent: string;
  }): void {
    const lines = newContent.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return;

    // Get or create session
    let sessionId = this.fileSessionMap.get(filePath);

    if (!sessionId) {
      // Try to extract session metadata
      const meta = this.extractSessionMeta(agentType, lines, filePath);
      if (meta) {
        sessionId = meta.sessionId;

        // Check if this repo is connected (or accept all if no repos connected)
        const connectedRepos = this.registry.getConnectedRepos();
        if (connectedRepos.length > 0 && !this.registry.isRepoConnected(meta.projectPath)) {
          // Skip sessions for non-connected repos when repos are configured
          return;
        }

        this.registry.getOrCreateSession(sessionId, agentType, meta.projectPath, filePath);
        this.fileSessionMap.set(filePath, sessionId);
      } else {
        // Can't determine session, skip
        return;
      }
    }

    // Parse and add activities
    const activities = this.parseLines(agentType, lines, sessionId, filePath);
    for (const activity of activities) {
      this.registry.addActivity(activity);
    }
  }

  private handleFileDeleted({
    filePath,
  }: {
    agentType: AgentType;
    filePath: string;
  }): void {
    const sessionId = this.fileSessionMap.get(filePath);
    if (sessionId) {
      // Don't end the session - file deletion might be due to rotation or cleanup
      // The session will be marked idle if no more activity
      this.fileSessionMap.delete(filePath);
    }
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

  // ============================================
  // PARSING HELPERS
  // ============================================

  private extractSessionMeta(
    agentType: AgentType,
    lines: string[],
    filePath: string
  ): { sessionId: string; projectPath: string } | null {
    switch (agentType) {
      case 'claude-code': {
        const meta = extractClaudeCodeSessionMeta(lines, filePath);
        if (meta) {
          return { sessionId: meta.sessionId, projectPath: meta.projectPath };
        }
        return null;
      }
      case 'codex': {
        const meta = extractCodexSessionMeta(lines[0]);
        if (meta) {
          return { sessionId: meta.sessionId, projectPath: meta.cwd };
        }
        return null;
      }
      case 'gemini': {
        const meta = extractGeminiSessionMeta(lines.join('\n'));
        if (meta && meta.sessionId) {
          return { sessionId: meta.sessionId, projectPath: meta.cwd };
        }
        return null;
      }
      default:
        return null;
    }
  }

  private parseLines(
    agentType: AgentType,
    lines: string[],
    sessionId: string,
    filePath: string
  ): AgentActivity[] {
    const activities: AgentActivity[] = [];

    for (const line of lines) {
      let parsed: AgentActivity[];

      switch (agentType) {
        case 'claude-code':
          parsed = parseClaudeCodeLine(line, filePath);
          break;
        case 'codex':
          parsed = parseCodexLine(line, sessionId, filePath);
          break;
        case 'gemini':
          // Gemini checkpoints are full JSON, not JSONL
          parsed = parseGeminiCheckpoint(line, filePath);
          break;
        default:
          parsed = [];
      }

      activities.push(...parsed);
    }

    return activities;
  }

  // ============================================
  // IDLE DETECTION
  // ============================================

  private checkForIdleSessions(): void {
    const now = Date.now();

    for (const session of this.registry.getActiveSessions()) {
      const lastActivity = new Date(session.lastActivityAt).getTime();

      if (now - lastActivity > this.IDLE_THRESHOLD_MS) {
        this.registry.markSessionIdle(session.id);
      }
    }
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
