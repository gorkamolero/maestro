// Agent Monitor Utility Process Worker
// Runs file watching and parsing in a separate process to avoid blocking the main process

import * as fs from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { join, basename, normalize } from 'path';
import { homedir } from 'os';
import type { AgentType, AgentActivity, AgentSession } from '@/types/agent-events';
import {
  parseClaudeCodeLine,
  extractClaudeCodeSessionMeta,
  parseCodexLine,
  extractCodexSessionMeta,
  parseGeminiCheckpoint,
  extractGeminiSessionMeta,
} from './parsers';

// ============================================
// TYPES
// ============================================

interface WorkerMessage {
  type: string;
  payload?: unknown;
}

interface ConnectRepoMessage extends WorkerMessage {
  type: 'connect-repo';
  payload: {
    path: string;
    absolutePath: string;
    spaceId: string;
  };
}

interface DisconnectRepoMessage extends WorkerMessage {
  type: 'disconnect-repo';
  payload: { absolutePath: string };
}

interface GetSessionsMessage extends WorkerMessage {
  type: 'get-sessions';
}

interface GetActivitiesMessage extends WorkerMessage {
  type: 'get-activities';
  payload: { sessionId?: string; limit?: number };
}

type IncomingMessage =
  | ConnectRepoMessage
  | DisconnectRepoMessage
  | GetSessionsMessage
  | GetActivitiesMessage
  | { type: 'start' }
  | { type: 'stop' };

// ============================================
// WATCH CONFIGS (copied from paths.ts to avoid import issues)
// ============================================

interface AgentWatchConfig {
  name: string;
  basePath: string;
  pattern: string;
}

const AGENT_WATCH_CONFIGS: Record<AgentType, AgentWatchConfig> = {
  'claude-code': {
    name: 'Claude Code',
    basePath: join(homedir(), '.claude', 'projects'),
    pattern: '**/*.jsonl',
  },
  codex: {
    name: 'Codex CLI',
    basePath: join(homedir(), '.codex', 'sessions'),
    pattern: '**/*.jsonl',
  },
  gemini: {
    name: 'Gemini CLI',
    basePath: join(homedir(), '.gemini', 'tmp'),
    pattern: '**/checkpoints/*.json',
  },
};

// ============================================
// STATE
// ============================================

const sessions: Map<string, AgentSession> = new Map();
const activities: AgentActivity[] = [];
const connectedRepos: Map<string, { path: string; spaceId: string }> = new Map();

const filePositions: Map<string, number> = new Map();
const incompleteLines: Map<string, string> = new Map();
const knownFiles: Map<string, AgentType> = new Map();
const fileSessionMap: Map<string, string> = new Map();

const dirWatchers: Map<string, fs.FSWatcher> = new Map();
let scanInterval: NodeJS.Timeout | null = null;
let idleCheckInterval: NodeJS.Timeout | null = null;

const SCAN_INTERVAL_MS = 5000;
const IDLE_THRESHOLD_MS = 30000;
const MAX_SCAN_DEPTH = 10;
const MAX_ACTIVITIES = 10000;

// ============================================
// HELPERS
// ============================================

function sendToMain(type: string, payload?: unknown): void {
  process.parentPort?.postMessage({ type, payload });
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const filename = basename(filePath);
  if (pattern.includes('*.jsonl')) return filename.endsWith('.jsonl');
  if (pattern.includes('*.json')) return filename.endsWith('.json');
  if (pattern.includes('checkpoints')) {
    return filePath.includes('checkpoints') && filename.endsWith('.json');
  }
  return false;
}

function extractSessionMeta(
  agentType: AgentType,
  lines: string[],
  filePath: string
): { sessionId: string; projectPath: string } | null {
  switch (agentType) {
    case 'claude-code': {
      const meta = extractClaudeCodeSessionMeta(lines, filePath);
      if (meta) return { sessionId: meta.sessionId, projectPath: meta.projectPath };
      return null;
    }
    case 'codex': {
      const meta = extractCodexSessionMeta(lines[0]);
      if (meta) return { sessionId: meta.sessionId, projectPath: meta.cwd };
      return null;
    }
    case 'gemini': {
      const meta = extractGeminiSessionMeta(lines.join('\n'));
      if (meta?.sessionId) return { sessionId: meta.sessionId, projectPath: meta.cwd };
      return null;
    }
    default:
      return null;
  }
}

function parseLines(
  agentType: AgentType,
  lines: string[],
  sessionId: string,
  filePath: string
): AgentActivity[] {
  const result: AgentActivity[] = [];

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
        parsed = parseGeminiCheckpoint(line, filePath);
        break;
      default:
        parsed = [];
    }
    result.push(...parsed);
  }

  return result;
}

function isRepoConnected(projectPath: string | undefined | null): boolean {
  if (connectedRepos.size === 0) return true; // Accept all if no repos configured
  if (!projectPath) return false; // No project path means we can't match

  const normalizedPath = normalize(projectPath);
  for (const [repoPath] of connectedRepos) {
    const normalizedRepo = normalize(repoPath);
    if (normalizedPath === normalizedRepo || normalizedPath.startsWith(normalizedRepo + '/')) {
      return true;
    }
  }
  return false;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

function getOrCreateSession(
  sessionId: string,
  agentType: AgentType,
  projectPath: string,
  filePath: string,
  timestamp?: string
): AgentSession {
  let session = sessions.get(sessionId);
  if (!session) {
    const activityTime = timestamp ? new Date(timestamp) : new Date();
    const isOld = Date.now() - activityTime.getTime() > ONE_HOUR_MS;

    session = {
      id: sessionId,
      agentType,
      projectPath,
      filePath,
      status: isOld ? 'ended' : 'active', // Mark old sessions as ended
      startedAt: activityTime.toISOString(),
      lastActivityAt: activityTime.toISOString(),
      toolCount: 0,
      errorCount: 0,
    };
    sessions.set(sessionId, session);

    // Only emit events for recent sessions to avoid flooding UI
    if (!isOld) {
      sendToMain('session:created', session);
    }
  }
  return session;
}

function updateSessionActivity(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = new Date().toISOString();
    if (session.status === 'idle') {
      session.status = 'active';
    }
    sendToMain('session:updated', session);
  }
}

function addActivity(activity: AgentActivity): void {
  activities.push(activity);

  // Trim if over limit
  if (activities.length > MAX_ACTIVITIES) {
    activities.splice(0, activities.length - MAX_ACTIVITIES);
  }

  // Update session
  const session = sessions.get(activity.sessionId);
  if (session) {
    session.lastActivityAt = activity.timestamp;
    if (activity.type === 'tool_use') {
      session.toolCount = (session.toolCount || 0) + 1;
    }
    if (activity.type === 'tool_result' && !(activity as { success?: boolean }).success) {
      session.errorCount = (session.errorCount || 0) + 1;
    }
  }

  sendToMain('activity:new', activity);
}

// ============================================
// FILE HANDLING
// ============================================

async function processFileChange(
  agentType: AgentType,
  filePath: string,
  isNew: boolean
): Promise<void> {
  try {
    // Get file stats to check modification time
    const fileStats = await stat(filePath);
    const fileModTime = fileStats.mtime;

    // Skip files older than 1 hour on initial scan
    if (isNew && Date.now() - fileModTime.getTime() > ONE_HOUR_MS) {
      return; // Skip old files entirely
    }

    const content = await readFile(filePath, 'utf8');
    const lastPosition = filePositions.get(filePath) || 0;

    const newContent = isNew || content.length < lastPosition ? content : content.slice(lastPosition);
    if (newContent.length === 0) return;

    const pending = incompleteLines.get(filePath) || '';
    const fullContent = pending + newContent;

    const lines = fullContent.split('\n');
    const incompleteLine = lines.pop() || '';

    incompleteLines.set(filePath, incompleteLine);
    filePositions.set(filePath, content.length - incompleteLine.length);

    const validLines = lines.filter((line) => line.trim().length > 0);
    if (validLines.length === 0) return;

    // Get or create session
    let sessionId = fileSessionMap.get(filePath);

    if (!sessionId) {
      const meta = extractSessionMeta(agentType, validLines, filePath);
      if (meta) {
        if (!isRepoConnected(meta.projectPath)) return;

        sessionId = meta.sessionId;
        const session = getOrCreateSession(
          sessionId,
          agentType,
          meta.projectPath,
          filePath,
          fileModTime.toISOString()
        );
        fileSessionMap.set(filePath, sessionId);

        // If session is old/ended, don't process activities
        if (session.status === 'ended') {
          return;
        }
      } else {
        return;
      }
    }

    // Parse and emit activities
    const newActivities = parseLines(agentType, validLines, sessionId, filePath);
    for (const activity of newActivities) {
      addActivity(activity);
    }

    updateSessionActivity(sessionId);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[AgentMonitorWorker] Error processing ${filePath}:`, error);
    }
  }
}

async function handleFsEvent(
  agentType: AgentType,
  eventType: string,
  filePath: string,
  pattern: string
): Promise<void> {
  if (!matchesPattern(filePath, pattern)) return;

  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      const isKnown = knownFiles.has(filePath);
      if (!isKnown) {
        knownFiles.set(filePath, agentType);
        await processFileChange(agentType, filePath, true);
      } else if (eventType === 'change') {
        await processFileChange(agentType, filePath, false);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      if (knownFiles.has(filePath)) {
        knownFiles.delete(filePath);
        filePositions.delete(filePath);
        incompleteLines.delete(filePath);
        fileSessionMap.delete(filePath);
      }
    }
  }
}

async function recursiveScan(
  agentType: AgentType,
  dirPath: string,
  pattern: string,
  depth: number
): Promise<void> {
  if (depth >= MAX_SCAN_DEPTH) return;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

      if (entry.isDirectory()) {
        await recursiveScan(agentType, fullPath, pattern, depth + 1);
      } else if (entry.isFile() && matchesPattern(fullPath, pattern)) {
        if (!knownFiles.has(fullPath)) {
          knownFiles.set(fullPath, agentType);
          await processFileChange(agentType, fullPath, true);
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

async function scanDirectory(
  agentType: AgentType,
  basePath: string,
  pattern: string
): Promise<void> {
  try {
    await recursiveScan(agentType, basePath, pattern, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[AgentMonitorWorker] Error scanning ${basePath}:`, error);
    }
  }
}

async function startWatcher(agentType: AgentType, config: AgentWatchConfig): Promise<void> {
  console.log(`[AgentMonitorWorker] Starting watcher for ${agentType}: ${config.basePath}`);

  try {
    await stat(config.basePath);
  } catch {
    console.log(`[AgentMonitorWorker] Base path not found: ${config.basePath}`);
    return;
  }

  try {
    const watcher = fs.watch(config.basePath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const filePath = join(config.basePath, filename);
      handleFsEvent(agentType, eventType, filePath, config.pattern);
    });

    watcher.on('error', (error) => {
      console.error(`[AgentMonitorWorker] Watcher error for ${agentType}:`, error);
    });

    dirWatchers.set(config.basePath, watcher);
  } catch (error) {
    console.error(`[AgentMonitorWorker] Failed to watch ${config.basePath}:`, error);
  }

  await scanDirectory(agentType, config.basePath, config.pattern);
}

function checkForIdleSessions(): void {
  const now = Date.now();

  for (const session of sessions.values()) {
    if (session.status !== 'active') continue;

    const lastActivity = new Date(session.lastActivityAt).getTime();
    if (now - lastActivity > IDLE_THRESHOLD_MS) {
      session.status = 'idle';
      sendToMain('session:updated', session);
    }
  }
}

// ============================================
// LIFECYCLE
// ============================================

async function start(): Promise<void> {
  console.log('[AgentMonitorWorker] Starting...');

  for (const [agentType, config] of Object.entries(AGENT_WATCH_CONFIGS)) {
    await startWatcher(agentType as AgentType, config);
  }

  scanInterval = setInterval(async () => {
    for (const [agentType, config] of Object.entries(AGENT_WATCH_CONFIGS)) {
      await scanDirectory(agentType as AgentType, config.basePath, config.pattern);
    }
  }, SCAN_INTERVAL_MS);

  idleCheckInterval = setInterval(() => {
    checkForIdleSessions();
  }, 10000);

  console.log('[AgentMonitorWorker] Started');
  sendToMain('started');
}

function stop(): void {
  console.log('[AgentMonitorWorker] Stopping...');

  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }

  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }

  for (const [, watcher] of dirWatchers) {
    watcher.close();
  }
  dirWatchers.clear();

  sessions.clear();
  activities.length = 0;
  connectedRepos.clear();
  filePositions.clear();
  incompleteLines.clear();
  knownFiles.clear();
  fileSessionMap.clear();

  console.log('[AgentMonitorWorker] Stopped');
  sendToMain('stopped');
}

// ============================================
// MESSAGE HANDLING
// ============================================

function handleMessage(message: IncomingMessage): void {
  switch (message.type) {
    case 'start':
      start();
      break;

    case 'stop':
      stop();
      break;

    case 'connect-repo':
      connectedRepos.set(message.payload.absolutePath, {
        path: message.payload.path,
        spaceId: message.payload.spaceId,
      });
      sendToMain('repo-connected', message.payload);
      break;

    case 'disconnect-repo':
      connectedRepos.delete(message.payload.absolutePath);
      sendToMain('repo-disconnected', message.payload);
      break;

    case 'get-sessions':
      sendToMain('sessions', Array.from(sessions.values()));
      break;

    case 'get-activities': {
      const { sessionId, limit = 100 } = message.payload || {};
      let result = activities;
      if (sessionId) {
        result = activities.filter((a) => a.sessionId === sessionId);
      }
      sendToMain('activities', result.slice(-limit));
      break;
    }

    default:
      console.warn(`[AgentMonitorWorker] Unknown message type: ${(message as WorkerMessage).type}`);
  }
}

// ============================================
// ENTRY POINT
// ============================================

process.parentPort?.on('message', (e) => {
  handleMessage(e.data as IncomingMessage);
});

console.log('[AgentMonitorWorker] Ready');
sendToMain('ready');
