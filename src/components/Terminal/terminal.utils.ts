import type { Terminal } from '@xterm/xterm';

/**
 * Terminal utility functions for XTerm.js
 */

/**
 * Parse ANSI color codes to extract plain text
 */
export function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Get the last N lines from terminal buffer
 */
export function getTerminalBuffer(terminal: Terminal, lines = 100): string {
  const buffer = terminal.buffer.active;
  const totalLines = buffer.length;
  const startLine = Math.max(0, totalLines - lines);

  const bufferLines: string[] = [];
  for (let i = startLine; i < totalLines; i++) {
    const line = buffer.getLine(i);
    if (line) {
      bufferLines.push(line.translateToString(true));
    }
  }

  return bufferLines.join('\n');
}

/**
 * Restore terminal buffer from saved content
 */
export function restoreTerminalBuffer(terminal: Terminal, content: string): void {
  if (!content) return;

  const lines = content.split('\n');
  lines.forEach((line) => {
    terminal.writeln(line);
  });
}

/**
 * Extract current working directory from prompt if possible
 * This is a simple heuristic and may not work for all shells
 */
export function extractWorkingDirectory(buffer: string): string | null {
  // Look for common shell prompts that include directory
  const patterns = [
    /(?:^|\n).*?([~/][\w\-/.]+)\s*[$#>]/m, // bash/zsh style
    /(?:^|\n).*?\[([~/][\w\-/.]+)\]/m, // bracketed style
  ];

  for (const pattern of patterns) {
    const match = buffer.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Format terminal title from working directory
 */
export function formatTerminalTitle(workingDir: string | null, fallback = 'Terminal'): string {
  if (!workingDir) return fallback;

  // Show only the last directory name
  const parts = workingDir.split('/');
  const lastDir = parts[parts.length - 1];

  return lastDir || fallback;
}

/**
 * Save terminal state for persistence
 */
export interface TerminalState {
  buffer: string;
  workingDir: string | null;
  scrollPosition: number;
  theme: 'termius-dark' | 'dracula' | 'nord';
  /** Initial working directory to spawn terminal in */
  cwd?: string;
  /** Initial command to run after terminal spawns */
  initialCommand?: string;
  /** Whether this is an agent terminal */
  isAgentTerminal?: boolean;
}

export function saveTerminalState(
  terminal: Terminal,
  theme: TerminalState['theme']
): TerminalState {
  const buffer = getTerminalBuffer(terminal);
  const workingDir = extractWorkingDirectory(buffer);

  return {
    buffer,
    workingDir,
    scrollPosition: terminal.buffer.active.viewportY,
    theme,
  };
}

/**
 * Restore terminal state from saved data
 */
export function restoreTerminalState(terminal: Terminal, state: TerminalState): void {
  if (state.buffer) {
    // Remove the last line (prompt) to avoid duplication when new shell starts
    const lines = state.buffer.split('\n');
    // Remove trailing empty lines and the last prompt line
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    if (lines.length > 0) {
      lines.pop(); // Remove the last prompt line
    }

    const bufferWithoutPrompt = lines.join('\n');
    if (bufferWithoutPrompt) {
      restoreTerminalBuffer(terminal, bufferWithoutPrompt);
    }
  }

  // Restore scroll position after buffer is loaded
  setTimeout(() => {
    terminal.scrollToLine(state.scrollPosition);
  }, 100);
}

/**
 * Clear terminal screen
 */
export function clearTerminal(terminal: Terminal): void {
  terminal.clear();
  terminal.reset();
}

/**
 * Search terminal buffer for text
 */
export function searchTerminalBuffer(terminal: Terminal, searchTerm: string): boolean {
  const buffer = getTerminalBuffer(terminal);
  return buffer.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Get terminal selection text
 */
export function getTerminalSelection(terminal: Terminal): string {
  return terminal.getSelection();
}

/**
 * Copy terminal selection to clipboard
 */
export async function copyTerminalSelection(terminal: Terminal): Promise<boolean> {
  const selection = getTerminalSelection(terminal);
  if (!selection) return false;

  try {
    await navigator.clipboard.writeText(selection);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Paste text into terminal
 */
export async function pasteToTerminal(terminal: Terminal): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText();
    terminal.paste(text);
    return true;
  } catch (err) {
    console.error('Failed to paste from clipboard:', err);
    return false;
  }
}
