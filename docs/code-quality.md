# Code Quality Patterns & Guidelines

This document tracks established patterns, utilities, and conventions for maintaining code quality in Maestro.

## Utilities & Hooks

### Error Handling (`src/lib/error-utils.ts`)

```typescript
import { handleError, logError, tryCatch } from '@/lib/error-utils';

// Instead of .catch(console.error)
fetchData().catch(handleError({ prefix: '[MyService]' }));

// With toast notification
saveData().catch(handleError({
  prefix: '[Save]',
  showToast: true,
  toastMessage: 'Failed to save'
}));

// In try/catch
try {
  await riskyOperation();
} catch (error) {
  logError(error, { prefix: '[MyService]', showToast: true });
}

// Tuple-style error handling
const [result, error] = await tryCatch(() => fetchData());
if (error) handleError(error);
```

### Constants (`src/lib/constants.ts`)

Centralized magic numbers and configuration values:

| Constant | Value | Usage |
|----------|-------|-------|
| `TABS_MAX_VISIBLE` | 6 | SpaceCard tab preview |
| `TAB_PREVIEW_MAX_VISIBLE` | 12 | TabPreviewList default |
| `RECENTLY_CLOSED_TABS_LIMIT` | 10 | workspace.store |
| `TERMINAL_LINES_BUFFER_SIZE` | 100 | agent.store |
| `TOOLTIP_DELAY_DURATION` | 0 | Instant tooltips |
| `ANIMATION_DURATION_FAST` | 0.1 | Micro-interactions |
| `ANIMATION_DURATION_NORMAL` | 0.2 | Standard animations |

### Hooks

#### `useStopPropagation` (`src/hooks/useStopPropagation.ts`)
```typescript
const stopPropagation = useStopPropagation();
<button onClick={stopPropagation}>Click</button>

// Or wrap a handler
const handleClick = useWithStopPropagation(() => doSomething());
```

#### `useModal` (`src/hooks/useModal.ts`)
```typescript
const modal = useModal();
<button onClick={modal.open}>Open</button>
<Dialog open={modal.isOpen} onOpenChange={modal.setIsOpen}>
```

#### `useEditableTitle` (`src/hooks/useEditableTitle.ts`)
For inline title editing with save/cancel.

### Components

#### `ColorPaletteSelector` (`src/components/ui/color-palette-selector.tsx`)
```typescript
// Simple colors
<ColorPaletteSelector
  colors={TAG_COLOR_PALETTE}
  selectedIndex={index}
  onSelect={(color, i) => setIndex(i)}
/>

// Color pairs (primary/secondary)
<ColorPaletteSelector
  colors={SPACE_COLOR_PALETTE}
  selectedColor={currentColor}
  onSelect={(pair) => setColor(pair.primary, pair.secondary)}
/>
```

---

## Store Patterns

### Explicit Return Types
All store actions should have explicit return types:

```typescript
// Good
removeSpace: (spaceId: string): void => { ... }
addSpace: (name: string): Space => { ... }
getSpace: (id: string): Space | undefined => { ... }

// Bad
removeSpace: (spaceId: string) => { ... }
```

---

## Component Guidelines

### Size Limits
- Target: < 250 lines per component
- Extract sub-components when exceeding this
- Use hooks to extract complex logic

### Examples of Extracted Components
| Parent | Extracted | Lines Saved |
|--------|-----------|-------------|
| SpaceCard | SpaceCardHeader | ~120 lines |

---

## Known Technical Debt

### Large Components (Need Refactoring)
| Component | Lines | Priority |
|-----------|-------|----------|
| `color-picker.tsx` | ~1,929 | Low (3rd party) |
| `AgentDrawer.tsx` | ~709 | Medium |
| `CommandPalette.tsx` | ~534 | Medium |

### Type Safety Gaps
- ~~`Tab.content?: unknown` - unused field~~ ✅ Removed
- Some event handlers use implicit typing

### Performance Opportunities
- ~~`usePerformance.ts` aggregations could be memoized~~ ✅ Fixed
- ~~Multiple `useCallback` hooks in SpaceCard could be consolidated~~ ✅ Reviewed - hooks are appropriate as-is
- ~~`NotesSidebar.buildTree()` missing memoization~~ ✅ Fixed - added useMemo
- ~~`CommandPalette` unmemoized search filters~~ ✅ Fixed - wrapped in useMemo
- ~~`useSpaceTasks` double filtering~~ ✅ Fixed - single-pass computation
- ~~`NotesSidebar` double `getAllTags()` calls~~ ✅ Fixed - memoized result
- ~~`TabPreview.getContextIcon()` store lookup in render~~ ✅ Fixed - memoized connectedApp
- ~~`useSpaceTabsPerformance` double iteration~~ ✅ Fixed - single-pass aggregation
- ~~`App.tsx` duplicate floating window filters~~ ✅ Fixed - combined into single check
- ~~`WindowManager` multiple useMemo filter passes~~ ✅ Fixed - single-pass categorization
- ~~`StatusBar` completedToday not memoized~~ ✅ Fixed - wrapped in useMemo
- ~~`SpaceCardHeader` hasLaunchableTabs not memoized~~ ✅ Fixed - wrapped in useMemo
- ~~`SpaceTasksSection` chained useMemo calls~~ ✅ Fixed - combined into single memo
- ~~`BrowserPanel` quickLinks array recreated on render~~ ✅ Fixed - extracted to constant

### React.memo Applied
Components wrapped with React.memo to prevent unnecessary re-renders:
- `TaskItem` - list item in task sections
- `SortableTaskItem` - draggable task wrapper
- `SpacePane` - sliding pane component
- `SpacePaneHeaderContent` - pane header
- `MaximizedView` - maximized window view
- `MinimizedDock` - minimized windows dock

---

## Naming Conventions

- Hooks: `use{Feature}` (e.g., `useModal`, `useEditableTitle`)
- Store actions: verb-first (e.g., `addSpace`, `removeTab`, `updateStatus`)
- Constants: `SCREAMING_SNAKE_CASE`
- Components: PascalCase, descriptive (e.g., `SpaceCardHeader`, `ColorPaletteSelector`)
