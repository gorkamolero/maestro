/**
 * Utility to apply space colors as CSS theme variables
 * This allows the space's primary color to become the app's accent color
 */

// Convert hex color to OKLCH (simplified conversion using browser's color parsing)
function hexToOklch(hex: string): string {
  // Create a temporary element to parse the color
  const temp = document.createElement('div');
  temp.style.color = hex;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  // Parse RGB values
  const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return hex;

  const r = parseInt(match[1]) / 255;
  const g = parseInt(match[2]) / 255;
  const b = parseInt(match[3]) / 255;

  // Convert to linear RGB
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // Convert to XYZ
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // Convert to OKLab
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_lab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // Convert to OKLCH
  const C = Math.sqrt(a * a + b_lab * b_lab);
  let H = Math.atan2(b_lab, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return `oklch(${L.toFixed(4)} ${C.toFixed(4)} ${H.toFixed(4)})`;
}

// Generate a contrasting foreground color (white or dark based on luminance)
function getContrastForeground(hex: string, isDark: boolean): string {
  // Parse hex
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Calculate relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Return white for dark colors, dark for light colors
  if (luminance > 0.5) {
    return isDark ? 'oklch(0.2244 0.0074 67.4370)' : 'oklch(0.2827 0.0311 258.3252)';
  }
  return 'oklch(1.0000 0 0)';
}

/**
 * Apply a space's colors as the app's theme
 */
export function applySpaceTheme(primaryColor: string, secondaryColor: string): void {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');

  const primaryOklch = hexToOklch(primaryColor);
  const foregroundOklch = getContrastForeground(primaryColor, isDark);

  // Update primary color
  root.style.setProperty('--primary', primaryOklch);
  root.style.setProperty('--primary-foreground', foregroundOklch);

  // Update ring color to match primary
  root.style.setProperty('--ring', primaryOklch);

  // Update sidebar primary
  root.style.setProperty('--sidebar-primary', primaryOklch);
  root.style.setProperty('--sidebar-primary-foreground', foregroundOklch);
  root.style.setProperty('--sidebar-ring', primaryOklch);

  // Update chart colors to use primary
  root.style.setProperty('--chart-1', primaryOklch);
}

/**
 * Reset theme to default (remove inline styles)
 */
export function resetSpaceTheme(): void {
  const root = document.documentElement;
  const properties = [
    '--primary',
    '--primary-foreground',
    '--ring',
    '--sidebar-primary',
    '--sidebar-primary-foreground',
    '--sidebar-ring',
    '--chart-1',
  ];

  properties.forEach((prop) => root.style.removeProperty(prop));
}
