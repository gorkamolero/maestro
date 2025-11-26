import type { ITheme } from '@xterm/xterm';

/**
 * Nord theme for XTerm.js
 * Arctic, north-bluish color palette
 */
export const nord: ITheme = {
  background: '#2e3440',
  foreground: '#d8dee9',
  cursor: '#d8dee9',
  cursorAccent: '#2e3440',
  selectionBackground: 'rgba(76, 86, 106, 0.5)',
  selectionForeground: '#d8dee9',

  // Black
  black: '#3b4252',
  brightBlack: '#4c566a',

  // Red
  red: '#bf616a',
  brightRed: '#d08770',

  // Green
  green: '#a3be8c',
  brightGreen: '#a3be8c',

  // Yellow
  yellow: '#ebcb8b',
  brightYellow: '#ebcb8b',

  // Blue
  blue: '#81a1c1',
  brightBlue: '#88c0d0',

  // Magenta
  magenta: '#b48ead',
  brightMagenta: '#b48ead',

  // Cyan
  cyan: '#88c0d0',
  brightCyan: '#8fbcbb',

  // White
  white: '#e5e9f0',
  brightWhite: '#eceff4',
};
