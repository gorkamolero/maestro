// Agent Monitor - File Watcher Service
// Watches for JSONL/JSON files from AI coding agents using native Node.js fs.watch

import * as fs from 'fs';
import { readFile, readdir, stat } from 'fs/promises';
import { join, dirname, basename, relative } from 'path';
import { EventEmitter } from 'events';
import { AGENT_WATCH_CONFIGS } from './paths';
import type { AgentType } from '@/types/agent-events';

interface FileWatcherEvents {
  'file:created': { agentType: AgentType; filePath: string };
  'file:changed': { agentType: AgentType; filePath: string; newContent: string };
  'file:deleted': { agentType: AgentType; filePath: string };
  error: { error: Error; context: string };
}

export interface AgentFileWatcher {
  on<K extends keyof FileWatcherEvents>(event: K, listener: (data: FileWatcherEvents[K]) => void): this;
  emit<K extends keyof FileWatcherEvents>(event: K, data: FileWatcherEvents[K]): boolean;
}

export class AgentFileWatcher extends EventEmitter {
  private dirWatchers: Map<string, fs.FSWatcher> = new Map();
  private fileWatchers: Map<string, fs.FSWatcher> = new Map();
  private filePositions: Map<string, number> = new Map();
  private incompleteLines: Map<string, string> = new Map();
  private knownFiles: Map<string, AgentType> = new Map(); // filePath -> agentType
  private scanInterval: NodeJS.Timeout | null = null;
  private readonly SCAN_INTERVAL_MS = 5000; // Rescan every 5 seconds
  private readonly MAX_SCAN_DEPTH = 10; // Prevent unbounded recursion

  constructor() {
    super();
  }

  async start(): Promise<void> {
    // Start watching for each agent type
    for (const [agentType, config] of Object.entries(AGENT_WATCH_CONFIGS)) {
      await this.startWatcher(agentType as AgentType, config);
    }

    // Periodic scan for new files (since native fs.watch doesn't recurse well on all platforms)
    this.scanInterval = setInterval(() => {
      this.scanForNewFiles();
    }, this.SCAN_INTERVAL_MS);
  }

  private async startWatcher(
    agentType: AgentType,
    config: (typeof AGENT_WATCH_CONFIGS)[AgentType]
  ): Promise<void> {
    console.log(`[AgentFileWatcher] Starting watcher for ${agentType}: ${config.basePath}`);

    // Check if base path exists
    try {
      await stat(config.basePath);
    } catch {
      console.log(`[AgentFileWatcher] Base path not found for ${agentType}: ${config.basePath}`);
      return;
    }

    // Watch the base directory for new subdirectories
    try {
      const watcher = fs.watch(config.basePath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const filePath = join(config.basePath, filename);
        this.handleFsEvent(agentType, eventType, filePath, config.pattern);
      });

      watcher.on('error', (error) => {
        console.error(`[AgentFileWatcher] Directory watcher error for ${agentType}:`, error);
        this.emit('error', { error, context: `${agentType} directory watcher` });
      });

      this.dirWatchers.set(config.basePath, watcher);
    } catch (error) {
      console.error(`[AgentFileWatcher] Failed to watch ${config.basePath}:`, error);
    }

    // Initial scan for existing files
    await this.scanDirectory(agentType, config.basePath, config.pattern);
  }

  private async handleFsEvent(
    agentType: AgentType,
    eventType: string,
    filePath: string,
    pattern: string
  ): Promise<void> {
    // Check if file matches pattern
    if (!this.matchesPattern(filePath, pattern)) return;

    try {
      const stats = await stat(filePath);

      if (stats.isFile()) {
        const isKnown = this.knownFiles.has(filePath);

        if (!isKnown) {
          // New file
          console.log(`[AgentFileWatcher] File added: ${filePath}`);
          this.knownFiles.set(filePath, agentType);
          this.emit('file:created', { agentType, filePath });
          await this.processFileChange(agentType, filePath, true);
        } else if (eventType === 'change') {
          // File changed
          await this.processFileChange(agentType, filePath, false);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File deleted
        if (this.knownFiles.has(filePath)) {
          console.log(`[AgentFileWatcher] File deleted: ${filePath}`);
          this.knownFiles.delete(filePath);
          this.filePositions.delete(filePath);
          this.incompleteLines.delete(filePath);
          this.emit('file:deleted', { agentType, filePath });
        }
      }
    }
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching for common cases
    // pattern: "**/*.jsonl" or "**/checkpoints/*.json"
    const filename = basename(filePath);

    if (pattern.includes('*.jsonl')) {
      return filename.endsWith('.jsonl');
    }
    if (pattern.includes('*.json')) {
      return filename.endsWith('.json');
    }
    if (pattern.includes('checkpoints')) {
      return filePath.includes('checkpoints') && filename.endsWith('.json');
    }

    return false;
  }

  private async scanDirectory(agentType: AgentType, basePath: string, pattern: string): Promise<void> {
    try {
      await this.recursiveScan(agentType, basePath, pattern, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[AgentFileWatcher] Error scanning ${basePath}:`, error);
      }
    }
  }

  private async recursiveScan(
    agentType: AgentType,
    dirPath: string,
    pattern: string,
    depth: number
  ): Promise<void> {
    // Prevent unbounded recursion
    if (depth >= this.MAX_SCAN_DEPTH) {
      console.warn(`[AgentFileWatcher] Max scan depth reached at: ${dirPath}`);
      return;
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories with incremented depth
          await this.recursiveScan(agentType, fullPath, pattern, depth + 1);
        } else if (entry.isFile() && this.matchesPattern(fullPath, pattern)) {
          // Found a matching file
          if (!this.knownFiles.has(fullPath)) {
            console.log(`[AgentFileWatcher] Found existing file: ${fullPath}`);
            this.knownFiles.set(fullPath, agentType);
            this.emit('file:created', { agentType, filePath: fullPath });
            await this.processFileChange(agentType, fullPath, true);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async scanForNewFiles(): Promise<void> {
    for (const [agentType, config] of Object.entries(AGENT_WATCH_CONFIGS)) {
      await this.scanDirectory(agentType as AgentType, config.basePath, config.pattern);
    }
  }

  private async processFileChange(agentType: AgentType, filePath: string, isNew: boolean): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf8');
      const lastPosition = this.filePositions.get(filePath) || 0;

      // For new files or if file was truncated, read from start
      const newContent = isNew || content.length < lastPosition ? content : content.slice(lastPosition);

      if (newContent.length === 0) return;

      // Handle incomplete lines from previous read
      const pending = this.incompleteLines.get(filePath) || '';
      const fullContent = pending + newContent;

      // Split into lines, keeping the last potentially incomplete line
      const lines = fullContent.split('\n');
      const incompleteLine = lines.pop() || '';

      // Store incomplete line for next read
      this.incompleteLines.set(filePath, incompleteLine);

      // Update position (minus incomplete line length)
      this.filePositions.set(filePath, content.length - incompleteLine.length);

      // Emit the new complete lines
      if (lines.length > 0) {
        const validLines = lines.filter((line) => line.trim().length > 0);
        if (validLines.length > 0) {
          this.emit('file:changed', {
            agentType,
            filePath,
            newContent: validLines.join('\n'),
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.emit('error', {
          error: error as Error,
          context: `reading ${filePath}`,
        });
      }
    }
  }

  async stop(): Promise<void> {
    // Stop periodic scanning
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    // Close directory watchers
    for (const [path, watcher] of this.dirWatchers) {
      console.log(`[AgentFileWatcher] Stopping directory watcher: ${path}`);
      watcher.close();
    }
    this.dirWatchers.clear();

    // Close file watchers
    for (const [path, watcher] of this.fileWatchers) {
      watcher.close();
    }
    this.fileWatchers.clear();

    // Clear state
    this.filePositions.clear();
    this.incompleteLines.clear();
    this.knownFiles.clear();

    console.log('[AgentFileWatcher] All watchers stopped');
  }

  // Force re-read a file from the beginning
  async rescanFile(filePath: string): Promise<void> {
    this.filePositions.delete(filePath);
    this.incompleteLines.delete(filePath);

    const agentType = this.knownFiles.get(filePath);
    if (agentType) {
      await this.processFileChange(agentType, filePath, true);
    }
  }

  // Check if watcher is active for an agent type
  isWatching(agentType: AgentType): boolean {
    const config = AGENT_WATCH_CONFIGS[agentType];
    return this.dirWatchers.has(config.basePath);
  }

  // Get count of watched files
  getWatchedFileCount(): number {
    return this.knownFiles.size;
  }
}
