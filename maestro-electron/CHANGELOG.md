# Changelog

All notable changes to Maestro will be documented in this file.

## [Unreleased]

### Added

#### Replace DnD Kit with react-easy-sort for Tab Reordering (2025-01-24)
- Migrated tabs system from @dnd-kit to react-easy-sort for smoother drag-and-drop
  - Grid view now supports true 2D dragging (horizontal and vertical)
  - List view uses `lockAxis="y"` for vertical-only dragging
  - Smoother animations with better visual feedback
  - Added `react-easy-sort` and `array-move` dependencies
- Created reusable components for list and grid views
  - `ListTab` - Simplified list view tab component with morphing edit
  - `GridTab` - Grid view tab component with icon-centered layout
  - Both support double-click to edit with smooth morphing animation
- Removed DnD Kit dependencies from tabs system
  - Deleted `DraggableWorkspace` wrapper component
  - Deleted `SortableGridTab` (replaced by `GridTab`)
  - Removed `DraggableTab` (replaced by `ListTab`)
  - Removed DnD Kit imports from `TabDropZone`, `FavoritesGrid`, `Sidebar`
  - DnD Kit packages remain for Tasks system usage

**Technical Details:**
- Uses `arrayMoveImmutable` from array-move for immutable reordering
- `SortableList` wraps both grid and list layouts
- Each tab wrapped in `SortableItem` with additional div wrapper (required by react-easy-sort)
- Grid view uses `flex flex-wrap` for responsive wrapping
- Added `data-draggable="true"` attribute for proper touch-action handling
- Opacity-based drag feedback with `draggedItemClassName="opacity-50"`

**Benefits:**
- Framer Motion Reorder only supports single-axis by design, react-easy-sort handles grids properly
- Simpler API with less boilerplate than DnD Kit
- Better mobile touch support out of the box
- Consistent drag behavior across list and grid views

#### Task Card Morphing Animation and Context Menu (2025-01-24)
- Implemented smooth morphing animation for task cards using Framer Motion
  - Card morphs between collapsed (70-90px) and expanded (300px) states
  - Spring-based animation with configurable stiffness (550), damping (45), and mass (0.7)
  - Task content always visible in collapsed state
  - Click any task to expand into inline edit form
  - AnimatePresence provides smooth opacity transitions
  - Click outside closes the edit form
- Added right-click context menu for task operations
  - Integrated Radix UI ContextMenu components
  - Delete task option with destructive styling (red text)
  - Trash2 icon for visual clarity
- Enhanced MorphSurface component flexibility
  - Modified to support custom render props (renderTrigger, renderContent)
  - Hides default dock when custom render props provided
  - Can now be used as general-purpose morphing container

**Technical Details:**
- Built morphing directly into TaskCard component (no wrapper)
- Used motion.div from motion/react for animations
- Maintains active/done visual states during morphing
- Form validation ensures title is required before saving
