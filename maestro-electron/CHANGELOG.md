# Changelog

All notable changes to Maestro will be documented in this file.

## [Unreleased]

### Added

#### Undo/Redo and Recently Closed Tabs (2025-01-24)
- Implemented global undo/redo system with Cmd+Z / Cmd+Shift+Z
  - Created `persistWithHistory` utility combining valtio-history with IndexedDB persistence
  - Debounced history saves (100ms) coalesce rapid mutations into single history entries
  - Works across workspace, tasks, and spaces stores
  - Handles valtio snapshot Date serialization edge case
- Added recently closed tabs feature with Shift+Cmd+T to restore
  - Stores last 10 closed tabs with metadata
  - `restoreRecentlyClosedTab()` action recreates tab with new ID
  - Closed tabs include original type, title, and configuration

**Technical Details:**
- `persistWithHistory<T>()` creates proxyWithHistory as source of truth
- Uses `skipSubscribe: true` with manual subscription for debounced batching
- `getWorkspaceStore()` getter pattern prevents stale references after undo
- Custom Date serialization handles frozen valtio snapshot objects
- Global `historyActions.undo()/redo()` tries each store in priority order

**Files Created/Modified:**
- `src/lib/persist-with-history.ts` - New utility combining history + persistence
- `src/stores/history.store.ts` - Global undo/redo actions
- `src/stores/workspace.store.ts` - Uses persistWithHistory, added recently closed tabs
- `src/stores/tasks.store.ts` - Uses persistWithHistory
- `src/stores/spaces.store.ts` - Uses persistWithHistory
- `src/App.tsx` - Keyboard shortcuts for undo/redo/restore tab

#### Tab Context Menu for Moving Between Spaces (2025-01-24)
- Added right-click context menu to tab components (both grid and list views)
  - "Move to Space" submenu shows all other available spaces
  - Space icons displayed in submenu for visual clarity
  - "Close Tab" option with destructive styling
  - Context menu filters out current space (only shows valid targets)
- Created shared `TabContextMenu` component
  - Single source of truth for context menu logic
  - Works consistently across GridTab and ListTab
  - Uses Radix UI ContextMenu with proper ContextMenuTrigger pattern
- Added `moveTabToSpace(tabId, targetSpaceId)` action to workspace store
  - Updates tab's spaceId to move it to target space
  - Handles active tab switching automatically
  - Clears active tab if moved tab was currently active

**Technical Details:**
- TabContextMenu wraps tab content as children (not anti-pattern wrapper)
- Uses `useSnapshot` to filter spaces reactively
- ContextMenuSub and ContextMenuSubContent for nested space selection
- FolderInput and Trash2 icons from lucide-react
- Properly stops propagation to prevent conflicts with drag/click

**Benefits:**
- Unified experience across both tab view modes
- Quick tab organization without drag-and-drop
- Clean separation of concerns (component vs logic)
- Extensible for future context menu items

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
