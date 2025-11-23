# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULES

### Git Commit Policy

**NEVER commit code without explicit user approval.**

- This is the user's project, not Claude's
- Always wait for the user to review changes before committing
- Only create commits when the user explicitly says "commit" or "commit this"
- If the user wants to see changes first, show them and wait for approval
- Exception: Only commit automatically if the user has previously established a clear pattern of wanting automatic commits in the current session

### Testing & Development Policy

**NEVER run `pnpm build` or `pnpm tauri build` to test changes.**

- Use `pnpm dev` or `pnpm tauri dev` for testing during development
- Building is slow and unnecessary for validation
- The dev server with hot reload is sufficient for testing
- Only build when explicitly requested by the user for production

### Code Style Rules

**React imports:**
- ALWAYS use named imports for React hooks: `import { useState, useEffect, useCallback } from 'react'`
- NEVER use `React.useState`, `React.useEffect`, etc. - this is bad style
- Import what you need directly from 'react'

## Project Overview

Maestro is an Electron desktop application (migrated from Tauri) with a React + TypeScript + Vite frontend. The application uses npm as its package manager.

## Stack Browser Pattern for Modals

Maestro implements the Stack Browser pattern (inspired by [Ika Pkhakadze's architecture](https://www.ika.im/posts/building-a-browser-in-electron)) to display modals above Electron BrowserViews.

### Why This Pattern?

BrowserViews in Electron sit in the OS window hierarchy, above the normal DOM. Standard React modals render in the DOM and appear **behind** BrowserViews. To show modals on top, we render them as separate BrowserViews positioned using Yoga layout.

### Implementation Components

1. **View Component** (`src/components/View.tsx`)
   - Uses Facebook Yoga layout engine for flexbox-style positioning
   - Calculates absolute bounds (x, y, width, height) for child elements
   - Provides bounds via React Context
   - Does NOT render DOM elements itself - only calculates layout

2. **PortalWindow Component** (`src/components/PortalWindow.tsx`)
   - Creates a portal window using `window.open()`
   - Reads bounds from parent View via `useViewBounds()` hook
   - Sends bounds to main process via IPC: `window.opener.electron.send('portal-body-bounds', webContentsId, bounds)`
   - **Critical timing fix**: Polls for `window.__WEBCONTENTS_ID__` to be set before sending bounds (fixes race condition)

3. **Portal Handler** (`src/ipc/portal.ts`)
   - Intercepts `window.open()` calls via `-add-new-contents` event
   - Creates BrowserView from intercepted WebContents
   - Listens for `portal-body-bounds` IPC message
   - Positions BrowserView using received bounds
   - Sets BrowserView as top view with `setTopBrowserView()`

### Usage Example

```tsx
// Centered 400x300 modal
<View style={{
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center'
}}>
  <View style={{ width: 400, height: 300 }}>
    <PortalWindow onClose={handleClose}>
      <ModalContent>
        {/* Your modal UI */}
      </ModalContent>
    </PortalWindow>
  </View>
</View>
```

### Common Pitfall: Timing Race Condition

**Problem**: `window.__WEBCONTENTS_ID__` is set asynchronously by the main process using `executeJavaScript()`, but PortalWindow needs it immediately to send bounds.

**Solution**: Poll for the ID before sending:
```typescript
const checkAndSend = () => {
  const webContentsId = windowRef.current.__WEBCONTENTS_ID__;
  if (webContentsId === undefined) {
    setTimeout(checkAndSend, 10);
    return;
  }
  // Send bounds with valid ID
};
```

### Valtio Store Persistence

Modal state (like `isAddModalOpen`, `showTestPortal`) should NOT be persisted:
```typescript
persist(initialState, 'store-name', {
  omit: ['isAddModalOpen', 'showTestPortal'] // Exclude UI state
})
```

## Architecture

### Dual Runtime Model

The application runs in two separate processes that communicate via Tauri's IPC bridge:

1. **Rust Backend** (`src-tauri/`)
   - Entry point: `src-tauri/src/main.rs` calls `maestro_lib::run()`
   - Core logic: `src-tauri/src/lib.rs` - Tauri builder, command handlers, and plugins
   - Crate type: Library with multiple output formats (`staticlib`, `cdylib`, `rlib`)
   - Crate name: `maestro_lib` (note the `_lib` suffix to avoid Windows conflicts with binary name)

2. **React Frontend** (`src/`)
   - Entry point: `src/main.tsx` renders the React app
   - Main component: `src/App.tsx`
   - Build target: Static files bundled into `dist/` directory
   - Dev server: Vite on port 1420 (strict port required by Tauri)

### Communication Pattern

Frontend-to-backend communication uses Tauri commands via `invoke()`:
- Frontend: `import { invoke } from "@tauri-apps/api/core"` then `await invoke("command_name", { args })`
- Backend: Functions decorated with `#[tauri::command]` and registered in `invoke_handler![]` macro

Example flow: `App.tsx` calls `invoke("greet", { name })` → `lib.rs` `greet()` function executes → returns `String` to frontend.

## Development Commands

### Running the Application

```bash
# Development mode (starts both Vite dev server and Tauri)
pnpm tauri dev

# Frontend only (for UI work without Rust changes)
pnpm dev
```

### Building

```bash
# Full production build (TypeScript compile + Vite build + Tauri bundle)
pnpm tauri build

# Frontend build only
pnpm build
```

This runs `tsc && vite build`, outputting to `dist/` which Tauri bundles via the `frontendDist` config.

### Rust Development

```bash
# From src-tauri directory
cd src-tauri

# Check Rust code
cargo check

# Run Rust tests
cargo test

# Build Rust only
cargo build
```

## Configuration Files

- `tauri.conf.json`: Tauri configuration including window settings, build commands, and bundle options
  - `beforeDevCommand`: `pnpm dev` (starts Vite dev server)
  - `beforeBuildCommand`: `pnpm build` (builds frontend assets)
  - `devUrl`: http://localhost:1420 (Vite dev server)
  - `frontendDist`: `../dist` (relative to src-tauri)

- `vite.config.ts`: Vite dev server configured for Tauri integration
  - Fixed port 1420 (strictPort: true)
  - Ignores watching `src-tauri/` to prevent reload loops
  - HMR configured for Tauri environment

- `Cargo.toml`: Rust dependencies and library configuration
  - Library name must be `maestro_lib` (not `maestro`) to avoid Windows binary name conflicts
  - Outputs multiple crate types for Tauri's FFI requirements

## Key Dependencies

**Frontend:**
- `@tauri-apps/api` - Core Tauri bindings for invoking commands
- `@tauri-apps/plugin-opener` - Opens URLs/files with system default apps
- React 19, TypeScript 5.8, Vite 7

**Backend:**
- `tauri` v2 - Core framework
- `tauri-plugin-opener` v2 - Opener plugin implementation
- `serde` + `serde_json` - Serialization for command arguments/returns

## Adding New Features

### Adding a Tauri Command

1. Add command function in `src-tauri/src/lib.rs`:
```rust
#[tauri::command]
fn your_command(arg: &str) -> Result<String, String> {
    // implementation
}
```

2. Register in builder:
```rust
.invoke_handler(tauri::generate_handler![greet, your_command])
```

3. Call from frontend:
```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("your_command", { arg: "value" });
```

### Adding Tauri Plugins

1. Add to `Cargo.toml` dependencies
2. Add corresponding npm package if it has frontend bindings
3. Register in `lib.rs` builder: `.plugin(plugin_name::init())`

## Documentation Policy

**When the user considers a feature or fix ready:**

Ask to update the project documentation:
- `CHANGELOG.md` - Add completed work with implementation details
- `docs/maestro-mvp-spec.md` - Move completed items from remaining work to completed section

This ensures documentation stays current and tracks project progress accurately.

## Code Organization

### Component Structure

**Keep components focused and maintainable:**
- Break up components when they exceed ~200-250 lines
- Extract reusable logic into hooks
- Separate concerns into smaller, focused components
- Move complex calculations or data transformations into utility functions

**When to refactor:**
- After completing a feature or work session
- When a component has multiple responsibilities
- When logic could be reused elsewhere
- When a component becomes difficult to understand at a glance

**Example refactoring patterns:**
- Extract event handlers into custom hooks
- Move data transformation logic to utility files
- Split UI sections into sub-components
- Create shared components for repeated patterns

## Component Libraries

This project has access to multiple shadcn-compatible component registries configured in `components.json`. For detailed information about available components, their use cases, and recommendations, see [docs/shadcn-registry-libraries-analysis.md](docs/shadcn-registry-libraries-analysis.md).

Available registries:
- **shadcn/ui** - Default registry with core UI components
- **@ai-elements** - AI SDK components for chat and streaming
- **@animate-ui** - Animation components
- **@cult-ui** - Modern UI components
- **@eldoraui** - UI component library
- **@glass-ui** - Glassmorphism components
- **@hextaui** - Design system components
- **@hooks** - React hooks collection
- **@magicui** - Animated components
- **@motion-primitives** - Motion and animation primitives
- **@reui** - React UI components
