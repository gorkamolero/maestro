import type { ITheme } from '@xterm/xterm';

/**
 * Dracula theme for XTerm.js
 * Popular dark theme with vibrant colors
 */
export const dracula: ITheme = {
  background: '#282a36',
  foreground: '#f8f8f2',
  cursor: '#f8f8f0',
  cursorAccent: '#282a36',
  selectionBackground: 'rgba(68, 71, 90, 0.5)',
  selectionForeground: '#f8f8f2',

  // Black
  black: '#21222c',
  brightBlack: '#6272a4',

  // Red
  red: '#ff5555',
  brightRed: '#ff6e6e',

  // Green
  green: '#50fa7b',
  brightGreen: '#69ff94',

  // Yellow
  yellow: '#f1fa8c',
  brightYellow: '#ffffa5',

  // Blue
  blue: '#bd93f9',
  brightBlue: '#d6acff',

  // Magenta
  magenta: '#ff79c6',
  brightMagenta: '#ff92df',

  // Cyan
  cyan: '#8be9fd',
  brightCyan: '#a4ffff',

  // White
  white: '#f8f8f2',
  brightWhite: '#ffffff',
};
