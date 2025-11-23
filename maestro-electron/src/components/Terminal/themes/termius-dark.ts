import type { ITheme } from '@xterm/xterm';

/**
 * Termius-inspired dark theme for XTerm.js
 * Professional and polished with subtle colors
 */
export const termiusDark: ITheme = {
  background: 'rgba(13, 17, 23, 0.95)',
  foreground: '#c9d1d9',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: 'rgba(88, 166, 255, 0.3)',
  selectionForeground: '#ffffff',

  // Black
  black: '#484f58',
  brightBlack: '#6e7681',

  // Red
  red: '#ff7b72',
  brightRed: '#ffa198',

  // Green
  green: '#3fb950',
  brightGreen: '#56d364',

  // Yellow
  yellow: '#d29922',
  brightYellow: '#e3b341',

  // Blue
  blue: '#58a6ff',
  brightBlue: '#79c0ff',

  // Magenta
  magenta: '#bc8cff',
  brightMagenta: '#d2a8ff',

  // Cyan
  cyan: '#39c5cf',
  brightCyan: '#56d4dd',

  // White
  white: '#b1bac4',
  brightWhite: '#f0f6fc',
};
