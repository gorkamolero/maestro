import { cn } from '@/lib/utils';

/**
 * Simple color (just a hex string)
 */
export type SimpleColor = string;

/**
 * Color pair (like SPACE_COLOR_PALETTE)
 */
export interface ColorPair {
  name: string;
  primary: string;
  secondary: string;
}

export type ColorOption = SimpleColor | ColorPair;

/**
 * Check if a color option is a ColorPair
 */
function isColorPair(color: ColorOption): color is ColorPair {
  return typeof color === 'object' && 'primary' in color;
}

/**
 * Get the display color from a color option
 */
function getDisplayColor(color: ColorOption): string {
  return isColorPair(color) ? color.primary : color;
}

interface ColorPaletteSelectorProps<T extends ColorOption> {
  /** Array of colors to display */
  colors: readonly T[];
  /** Currently selected color (or index) */
  selectedColor?: string;
  /** Selected index (alternative to selectedColor) */
  selectedIndex?: number;
  /** Callback when a color is selected */
  onSelect: (color: T, index: number) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
  /** Grid columns (default based on size) */
  columns?: number;
}

const sizeConfig = {
  sm: { circle: 'w-5 h-5', gap: 'gap-1.5' },
  md: { circle: 'w-6 h-6', gap: 'gap-1' },
  lg: { circle: 'w-8 h-8', gap: 'gap-2' },
} as const;

/**
 * Reusable color palette selector component.
 * Works with both simple colors (strings) and color pairs (objects with primary/secondary).
 *
 * @example
 * // With simple colors
 * <ColorPaletteSelector
 *   colors={TAG_COLOR_PALETTE}
 *   selectedIndex={selectedIndex}
 *   onSelect={(color, index) => setSelectedIndex(index)}
 * />
 *
 * @example
 * // With color pairs
 * <ColorPaletteSelector
 *   colors={SPACE_COLOR_PALETTE}
 *   selectedColor={space.primaryColor}
 *   onSelect={(pair) => handleColorChange(pair.primary, pair.secondary)}
 * />
 */
export function ColorPaletteSelector<T extends ColorOption>({
  colors,
  selectedColor,
  selectedIndex,
  onSelect,
  size = 'md',
  className,
  columns = 4,
}: ColorPaletteSelectorProps<T>) {
  const { circle, gap } = sizeConfig[size];

  const isSelected = (color: T, index: number): boolean => {
    if (selectedIndex !== undefined) {
      return index === selectedIndex;
    }
    if (selectedColor !== undefined) {
      const displayColor = getDisplayColor(color);
      return displayColor === selectedColor;
    }
    return false;
  };

  return (
    <div
      className={cn('grid', gap, className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {colors.map((color, index) => {
        const displayColor = getDisplayColor(color);
        const selected = isSelected(color, index);
        const title = isColorPair(color) ? color.name : undefined;

        return (
          <button
            key={displayColor}
            type="button"
            onClick={() => onSelect(color, index)}
            className={cn(
              circle,
              'rounded-full transition-all duration-200',
              'hover:scale-110',
              selected
                ? 'ring-2 ring-offset-2 ring-offset-popover ring-primary scale-110'
                : 'opacity-70 hover:opacity-100'
            )}
            style={{ backgroundColor: displayColor }}
            title={title}
          />
        );
      })}
    </div>
  );
}
