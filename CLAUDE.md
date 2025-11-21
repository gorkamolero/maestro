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

## Project Overview

Maestro is a Tauri v2 desktop application combining a Rust backend with a React + TypeScript + Vite frontend. The application uses pnpm as its package manager.

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
