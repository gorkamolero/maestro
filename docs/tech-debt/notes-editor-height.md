# Notes Editor Height Issue

**Status**: Open
**Priority**: Medium
**Created**: 2025-11-29

## Problem

The Notes editor (Lexical ContentEditable) in Space cards doesn't expand to fill available vertical space. Users cannot click in the empty area below the placeholder text to focus the editor.

### Current Behavior
- Notes section visually takes up space in the card
- But the actual clickable/editable area is only ~40px tall
- Clicking below the placeholder text doesn't focus the editor

### Expected Behavior
- Notes editor should fill all available vertical space
- Clicking anywhere in the Notes section should focus the editor

## Technical Details

### Root Cause
The issue is a combination of:
1. **Framer Motion animation**: `CollapsibleSection` uses `motion.div` with `animate={{ height: 'auto' }}` which prevents `flex-grow` from working
2. **Nested flex containers**: Multiple layers of flex containers need `min-h-0` and `h-full` to properly propagate height
3. **Lexical ContentEditable**: The editor component needs explicit height to fill available space

### Affected Files
- `src/components/ControlRoom/SpaceCard.tsx` - Desktop space cards
- `src/components/ControlRoom/CollapsibleSection.tsx` - Collapsible wrapper
- `src/components/ControlRoom/SpaceNotesEditor.tsx` - Desktop notes editor
- `src/mobile/components/SpaceCard.tsx` - Mobile space cards
- `src/mobile/components/NotesEditor.tsx` - Mobile notes editor

### Attempted Fixes
1. Added `flex-1 min-h-0 flex flex-col` to containers
2. Changed motion.div animation to opacity-only (removed height animation)
3. Added `h-full` to various containers
4. Added `contentClassName` prop to CollapsibleSection

These changes partially work but the fix is incomplete.

## Potential Solutions

### Option 1: Remove animation for Notes section
Don't animate the Notes section open/close - just show/hide instantly. This avoids the height animation conflict.

### Option 2: Use CSS Grid instead of Flexbox
Grid layout with `grid-template-rows: auto 1fr` might handle this better than nested flexbox.

### Option 3: JavaScript-based height calculation
Calculate available height and set it explicitly on the ContentEditable.

### Option 4: Wrapper div with click handler
Add a wrapper div that fills the space and focuses the editor on click, even if the ContentEditable itself doesn't fill the space.

## Reproduction Steps

1. Open Maestro desktop app
2. Open a Space card with the Notes section expanded
3. Try clicking in the empty area below "Write notes..." placeholder
4. Notice the cursor doesn't appear and editor doesn't focus

## Related Issues
- Mobile has the same issue in `SpaceCard.tsx`
