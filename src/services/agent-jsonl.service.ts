import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

interface ConversationEntry {
  type: string;
  message?: {
    role: string;
    content: unknown;
  };
  timestamp?: string;
  costUSD?: number;
  durationMs?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

interface SessionAnalytics {
  sessionId: string;
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  messageCount: number;
  toolUseCount: number;
  durationMs: number;
  lastUpdated: string;
}

/**
 * AgentJsonlService watches Claude's JSONL conversation logs for analytics.
 *
 * Claude Code stores conversations in ~/.claude/projects/{uuid}.jsonl
 * This service monitors these files for cost tracking and conversation replay.
 */
export class AgentJsonlService {
  private watchers = new Map<string, fs.FSWatcher>();
  private analytics = new Map<string, SessionAnalytics>();
  private projectsDir: string;

  constructor() {
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects');
  }

  /**
   * Start watching Claude's projects directory for new sessions
   */
  startWatching(window: BrowserWindow) {
    // Ensure directory exists
    if (!fs.existsSync(this.projectsDir)) {
      console.log('[AgentJsonlService] Claude projects directory not found:', this.projectsDir);
      return;
    }

    console.log('[AgentJsonlService] Watching:', this.projectsDir);

    // Watch for new files
    const dirWatcher = fs.watch(this.projectsDir, (eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        const filePath = path.join(this.projectsDir, filename);

        if (eventType === 'rename' && fs.existsSync(filePath)) {
          // New file created
          this.watchSessionFile(filePath, window);
        }
      }
    });

    this.watchers.set('dir', dirWatcher);

    // Watch existing files
    const files = fs.readdirSync(this.projectsDir).filter((f) => f.endsWith('.jsonl'));
    for (const file of files) {
      this.watchSessionFile(path.join(this.projectsDir, file), window);
    }
  }

  /**
   * Stop all watchers
   */
  stopWatching() {
    for (const [key, watcher] of this.watchers) {
      watcher.close();
      console.log('[AgentJsonlService] Stopped watching:', key);
    }
    this.watchers.clear();
  }

  /**
   * Watch a specific session file for updates
   */
  private watchSessionFile(filePath: string, window: BrowserWindow) {
    const sessionId = path.basename(filePath, '.jsonl');

    if (this.watchers.has(sessionId)) {
      return; // Already watching
    }

    console.log('[AgentJsonlService] Watching session:', sessionId);

    // Initial parse
    this.parseSessionFile(filePath, sessionId, window);

    // Watch for changes
    const watcher = fs.watch(filePath, () => {
      this.parseSessionFile(filePath, sessionId, window);
    });

    this.watchers.set(sessionId, watcher);
  }

  /**
   * Parse a session JSONL file and emit analytics
   */
  private async parseSessionFile(filePath: string, sessionId: string, window: BrowserWindow) {
    const analytics: SessionAnalytics = {
      sessionId,
      totalCostUSD: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      messageCount: 0,
      toolUseCount: 0,
      durationMs: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        try {
          const entry: ConversationEntry = JSON.parse(line);

          // Accumulate analytics
          if (entry.costUSD) {
            analytics.totalCostUSD += entry.costUSD;
          }

          if (entry.durationMs) {
            analytics.durationMs += entry.durationMs;
          }

          if (entry.usage) {
            analytics.totalInputTokens += entry.usage.input_tokens || 0;
            analytics.totalOutputTokens += entry.usage.output_tokens || 0;
            analytics.totalCacheReadTokens += entry.usage.cache_read_input_tokens || 0;
          }

          if (entry.type === 'assistant' || entry.type === 'user') {
            analytics.messageCount++;
          }

          if (entry.type === 'tool_use') {
            analytics.toolUseCount++;
          }
        } catch {
          // Skip malformed lines
        }
      }

      // Store and emit
      this.analytics.set(sessionId, analytics);

      if (!window.isDestroyed()) {
        window.webContents.send('agent:analytics', analytics);
      }
    } catch (error) {
      console.error('[AgentJsonlService] Error parsing file:', error);
    }
  }

  /**
   * Get analytics for a specific session
   */
  getAnalytics(sessionId: string): SessionAnalytics | undefined {
    return this.analytics.get(sessionId);
  }

  /**
   * Get all session analytics
   */
  getAllAnalytics(): SessionAnalytics[] {
    return Array.from(this.analytics.values());
  }

  /**
   * Get total cost across all sessions
   */
  getTotalCost(): number {
    let total = 0;
    for (const analytics of this.analytics.values()) {
      total += analytics.totalCostUSD;
    }
    return total;
  }

  /**
   * List available session files
   */
  listSessions(): string[] {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }

    return fs
      .readdirSync(this.projectsDir)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => path.basename(f, '.jsonl'));
  }

  /**
   * Read full conversation history for a session
   */
  async readSessionHistory(sessionId: string): Promise<ConversationEntry[]> {
    const filePath = path.join(this.projectsDir, `${sessionId}.jsonl`);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const entries: ConversationEntry[] = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    return entries;
  }
}

// Singleton instance
export const agentJsonlService = new AgentJsonlService();
