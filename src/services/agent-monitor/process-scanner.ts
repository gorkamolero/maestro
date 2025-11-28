// Agent Monitor - Process Scanner Service
// Detects running AI coding agent processes

import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import type { AgentType, DetectedProcess } from '@/types/agent-events';

const execAsync = promisify(exec);

export class ProcessScanner {
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScan: DetectedProcess[] = [];
  private onUpdate: ((processes: DetectedProcess[]) => void) | null = null;

  async scan(): Promise<DetectedProcess[]> {
    const processes = await this.getProcessList();
    const detected: DetectedProcess[] = [];

    for (const proc of processes) {
      const agentType = this.identifyAgent(proc);
      if (agentType) {
        const cwd = await this.getProcessCwd(proc.pid);
        detected.push({
          pid: proc.pid,
          name: proc.name,
          cmd: proc.cmd,
          cwd,
          agentType,
        });
      }
    }

    return detected;
  }

  private async getProcessList(): Promise<Array<{ pid: number; name: string; cmd: string }>> {
    const os = platform();
    const processes: Array<{ pid: number; name: string; cmd: string }> = [];

    try {
      if (os === 'darwin' || os === 'linux') {
        // Use ps command to get process list
        const { stdout } = await execAsync('ps -eo pid,comm,args', {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large process lists
        });

        const lines = stdout.trim().split('\n').slice(1); // Skip header

        for (const line of lines) {
          const match = line.trim().match(/^\s*(\d+)\s+(\S+)\s+(.*)$/);
          if (match) {
            const pid = parseInt(match[1], 10);
            const name = match[2];
            const cmd = match[3];
            processes.push({ pid, name, cmd });
          }
        }
      } else if (os === 'win32') {
        // Windows: use wmic
        const { stdout } = await execAsync('wmic process get ProcessId,Name,CommandLine /format:csv', {
          maxBuffer: 10 * 1024 * 1024,
        });

        const lines = stdout.trim().split('\n').slice(1); // Skip header

        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 3) {
            const cmd = parts[1] || '';
            const name = parts[2] || '';
            const pid = parseInt(parts[3], 10);
            if (!isNaN(pid)) {
              processes.push({ pid, name, cmd });
            }
          }
        }
      }
    } catch (error) {
      console.error('[ProcessScanner] Error getting process list:', error);
    }

    return processes;
  }

  private identifyAgent(proc: { name: string; cmd: string }): AgentType | null {
    const cmd = proc.cmd.toLowerCase();
    const name = proc.name.toLowerCase();

    // Claude Code runs as node with claude-code in the path
    if (name === 'node' || name === 'node.exe') {
      if (cmd.includes('claude-code') || cmd.includes('@anthropic-ai/claude-code')) {
        return 'claude-code';
      }
      // Gemini CLI also runs as node
      if (cmd.includes('gemini-cli') || cmd.includes('@google/gemini')) {
        return 'gemini';
      }
    }

    // Codex is a Rust binary
    if (name === 'codex' || name === 'codex.exe') {
      return 'codex';
    }

    return null;
  }

  private async getProcessCwd(pid: number): Promise<string | undefined> {
    const os = platform();

    try {
      if (os === 'linux') {
        // Linux: /proc/{pid}/cwd is a symlink to the cwd
        const { stdout } = await execAsync(`readlink /proc/${pid}/cwd 2>/dev/null`);
        return stdout.trim() || undefined;
      } else if (os === 'darwin') {
        // macOS: use lsof
        const { stdout } = await execAsync(
          `lsof -a -d cwd -p ${pid} -Fn 2>/dev/null | grep ^n | cut -c2-`
        );
        return stdout.trim() || undefined;
      } else if (os === 'win32') {
        // Windows: use PowerShell (this is a simplified approach)
        const { stdout } = await execAsync(
          `powershell -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).Path | Split-Path -Parent"`,
          { shell: 'powershell.exe' }
        );
        return stdout.trim() || undefined;
      }
    } catch {
      // Process may have exited or we don't have permission
      return undefined;
    }

    return undefined;
  }

  startPolling(intervalMs: number, callback: (processes: DetectedProcess[]) => void): void {
    this.onUpdate = callback;

    // Initial scan
    this.scan()
      .then((processes) => {
        this.lastScan = processes;
        callback(processes);
      })
      .catch((error) => {
        console.error('[ProcessScanner] Initial scan error:', error);
      });

    // Periodic scans
    this.scanInterval = setInterval(async () => {
      try {
        const processes = await this.scan();

        // Only emit if something changed
        if (this.hasChanged(processes)) {
          this.lastScan = processes;
          callback(processes);
        }
      } catch (error) {
        console.error('[ProcessScanner] Polling scan error:', error);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.onUpdate = null;
  }

  private hasChanged(newProcesses: DetectedProcess[]): boolean {
    if (newProcesses.length !== this.lastScan.length) return true;

    const oldPids = new Set(this.lastScan.map((p) => p.pid));
    const newPids = new Set(newProcesses.map((p) => p.pid));

    for (const pid of newPids) {
      if (!oldPids.has(pid)) return true;
    }

    return false;
  }

  getLastScan(): DetectedProcess[] {
    return [...this.lastScan];
  }
}
