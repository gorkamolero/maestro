import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const execAsync = promisify(exec);

interface WorktreeInfo {
  sessionId: string;
  originalDir: string;
  worktreePath: string;
  branch: string;
  createdAt: string;
}

/**
 * GitWorktreeService provides session isolation using git worktrees.
 *
 * Per spec: "Crystal uses git worktrees for session isolation (no containers needed)"
 *
 * Each agent session gets its own worktree, allowing parallel sessions to
 * work on the same repo without conflicts. Changes are isolated until merged.
 */
export class GitWorktreeService {
  private worktrees = new Map<string, WorktreeInfo>();
  private maestroWorktreesDir: string;

  constructor() {
    // Store worktrees in ~/.maestro/worktrees
    this.maestroWorktreesDir = path.join(os.homedir(), '.maestro', 'worktrees');
  }

  /**
   * Check if a directory is a git repository
   */
  async isGitRepo(dir: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: dir });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the root of the git repository
   */
  async getRepoRoot(dir: string): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: dir });
    return stdout.trim();
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(dir: string): Promise<string> {
    const { stdout } = await execAsync('git branch --show-current', { cwd: dir });
    return stdout.trim() || 'HEAD';
  }

  /**
   * Create an isolated worktree for an agent session
   *
   * @param sessionId - Unique session identifier
   * @param projectDir - The original project directory
   * @returns Path to the isolated worktree, or original dir if not a git repo
   */
  async createWorktree(sessionId: string, projectDir: string): Promise<string> {
    // Check if it's a git repo
    const isRepo = await this.isGitRepo(projectDir);
    if (!isRepo) {
      console.log('[GitWorktreeService] Not a git repo, using original directory:', projectDir);
      return projectDir;
    }

    try {
      const repoRoot = await this.getRepoRoot(projectDir);
      const currentBranch = await this.getCurrentBranch(repoRoot);

      // Create unique branch name for this session
      const sessionBranch = `maestro-session-${sessionId.slice(0, 8)}`;

      // Create worktree directory
      const worktreePath = path.join(this.maestroWorktreesDir, sessionId);

      // Ensure parent directory exists
      await fs.promises.mkdir(this.maestroWorktreesDir, { recursive: true });

      // Create worktree with new branch based on current branch
      await execAsync(`git worktree add -b ${sessionBranch} "${worktreePath}" ${currentBranch}`, {
        cwd: repoRoot,
      });

      const worktreeInfo: WorktreeInfo = {
        sessionId,
        originalDir: repoRoot,
        worktreePath,
        branch: sessionBranch,
        createdAt: new Date().toISOString(),
      };

      this.worktrees.set(sessionId, worktreeInfo);
      console.log('[GitWorktreeService] Created worktree:', worktreeInfo);

      return worktreePath;
    } catch (error) {
      console.error('[GitWorktreeService] Failed to create worktree:', error);
      // Fall back to original directory
      return projectDir;
    }
  }

  /**
   * Remove a worktree when session ends
   */
  async removeWorktree(sessionId: string): Promise<void> {
    const worktreeInfo = this.worktrees.get(sessionId);
    if (!worktreeInfo) {
      return;
    }

    try {
      // Remove the worktree
      await execAsync(`git worktree remove "${worktreeInfo.worktreePath}" --force`, {
        cwd: worktreeInfo.originalDir,
      });

      // Delete the session branch
      await execAsync(`git branch -D ${worktreeInfo.branch}`, {
        cwd: worktreeInfo.originalDir,
      });

      this.worktrees.delete(sessionId);
      console.log('[GitWorktreeService] Removed worktree:', sessionId);
    } catch (error) {
      console.error('[GitWorktreeService] Failed to remove worktree:', error);

      // Try to clean up the directory anyway
      try {
        await fs.promises.rm(worktreeInfo.worktreePath, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Merge changes from worktree back to original branch
   */
  async mergeWorktree(sessionId: string, commitMessage?: string): Promise<boolean> {
    const worktreeInfo = this.worktrees.get(sessionId);
    if (!worktreeInfo) {
      console.error('[GitWorktreeService] No worktree found for session:', sessionId);
      return false;
    }

    try {
      // Check if there are any changes in the worktree
      const { stdout: status } = await execAsync('git status --porcelain', {
        cwd: worktreeInfo.worktreePath,
      });

      if (status.trim()) {
        // Commit changes in worktree
        await execAsync('git add -A', { cwd: worktreeInfo.worktreePath });
        await execAsync(
          `git commit -m "${commitMessage || `Maestro session ${sessionId.slice(0, 8)}`}"`,
          {
            cwd: worktreeInfo.worktreePath,
          }
        );
      }

      // Get the original branch
      const { stdout: originalBranch } = await execAsync('git branch --show-current', {
        cwd: worktreeInfo.originalDir,
      });

      // Merge the session branch into original
      await execAsync(`git merge ${worktreeInfo.branch}`, {
        cwd: worktreeInfo.originalDir,
      });

      console.log(
        '[GitWorktreeService] Merged worktree:',
        sessionId,
        'into',
        originalBranch.trim()
      );
      return true;
    } catch (error) {
      console.error('[GitWorktreeService] Failed to merge worktree:', error);
      return false;
    }
  }

  /**
   * Get worktree info for a session
   */
  getWorktree(sessionId: string): WorktreeInfo | undefined {
    return this.worktrees.get(sessionId);
  }

  /**
   * Get the working directory for a session (worktree path or original)
   */
  getWorkDir(sessionId: string, originalDir: string): string {
    const worktree = this.worktrees.get(sessionId);
    return worktree?.worktreePath || originalDir;
  }

  /**
   * List all active worktrees
   */
  listWorktrees(): WorktreeInfo[] {
    return Array.from(this.worktrees.values());
  }

  /**
   * Clean up all worktrees (call on app exit)
   */
  async cleanupAll(): Promise<void> {
    const sessions = Array.from(this.worktrees.keys());
    for (const sessionId of sessions) {
      await this.removeWorktree(sessionId);
    }
  }
}

// Singleton instance
export const gitWorktreeService = new GitWorktreeService();
