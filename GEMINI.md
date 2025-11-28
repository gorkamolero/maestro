# Maestro - Project Context for Gemini

## Project Overview
Maestro is a workspace browser designed for focused productivity, built as a desktop application using **Electron** (migrated from Tauri). It features a highly interactive interface with split panes, integrated terminal, web browser capabilities, and an application launcher.

## Tech Stack
-   **Runtime:** Electron 39.2.3 (managed via Electron Forge)
-   **Language:** TypeScript 5.8
-   **Frontend Framework:** React 19
-   **Build Tool:** Vite 5.4
-   **Styling:** Tailwind CSS 4, shadcn/ui, Lucide Icons
-   **State Management:** Valtio (with `valtio-persist` for IndexedDB persistence)
-   **Layout Engine:** Yoga Layout (for the "Stack Browser" pattern)
-   **Animation:** Motion (Framer Motion)
-   **Package Manager:** npm / pnpm

## Architecture

### The "Stack Browser" Pattern
Maestro uses a unique architecture to manage views. Unlike typical Electron apps that use webviews or iframes, Maestro uses native **Electron BrowserViews** for content (browsers, terminals, etc.).

*   **Problem:** Native `BrowserView`s sit *above* the standard HTML DOM (z-index independent). This makes it impossible to render React modals or overlays on top of them using standard CSS.
*   **Solution:** The "Stack Browser" pattern (inspired by Ika Pkhakadze).
    *   **`View.tsx`**: Uses `yoga-layout` to calculate the exact screen coordinates (x, y, width, height) for where a view *should* be.
    *   **`PortalWindow.tsx`**: Instead of rendering HTML, it sends these coordinates to the Main process via IPC.
    *   **Main Process**: Resizes and positions the native `BrowserView` to match these coordinates.
    *   **Modals**: Modals are *also* rendered as separate `BrowserView`s (via `window.open` interception) so they can sit on top of content views.

### Process Structure
-   **Main Process (`src/main.ts`)**: Handles window creation, IPC handling, PTY spawning (node-pty), and `BrowserView` management.
-   **Preload Script (`src/preload.ts`)**: Exposes safe APIs to the renderer via `contextBridge`.
-   **Renderer Process (`src/App.tsx`)**: The React application that draws the UI chrome (sidebar, tabs, command palette) and orchestrates the layout.

### Data Flow
-   **IPC**: Extensive use of IPC for Main-Renderer communication.
    -   `src/ipc/`: Contains handler definitions for different domains (`terminal`, `browser`, `launcher`, `portal`).
-   **State**: `valtio` stores in `src/stores/` manage application state. Changes are reactive.
    -   **Persistence**: State is persisted to IndexedDB. Note: UI-transient state (like `isAddModalOpen`) is explicitly omitted from persistence.

## Development Workflow

### Commands
*   **Start Development Server:**
    ```bash
    npm start
    # Runs 'electron-forge start' - Launches the app with HMR
    ```
*   **Lint:**
    ```bash
    npm run lint
    ```
*   **Build & Package:**
    ```bash
    npm run make
    # Creates the distributable (e.g., .app, .zip) in 'out/'
    ```
*   **Deploy (Local):**
    ```bash
    npm run deploy
    # Builds and moves the .app to /Applications
    ```

### Verification
*   **Testing:** Rely on `npm start` for dev testing. Do not run full builds for quick verification.
*   **Commits:** **NEVER** commit without explicit user approval.

## Code Conventions

### React
*   **Imports:** Use named imports for hooks.
    *   ✅ `import { useState, useEffect } from 'react'`
    *   ❌ `import React from 'react'; React.useState(...)`
*   **Components:** Keep components small (< 250 lines). Extract logic to hooks (`src/hooks`) or utility functions (`src/lib`).
*   **Styling:** Use Tailwind CSS utility classes.

### State Management (Valtio)
*   Use `useSnapshot` for reading state in components.
*   Mutate state directly (e.g., `store.count++`) outside of render.
*   **Persistence:** Be careful when adding new state properties; decide if they should be persisted or excluded in the store definition.

## Key Directory Structure

```
/src
  ├── main.ts             # Electron Main Process entry
  ├── preload.ts          # Electron Preload script
  ├── App.tsx             # React App entry
  ├── components/         # React components
  │   ├── Browser/        # BrowserView controls
  │   ├── Terminal/       # XTerm.js integration
  │   ├── View.tsx        # Yoga layout wrapper
  │   └── PortalWindow.tsx # Portal implementation
  ├── ipc/                # IPC channel definitions & handlers
  ├── stores/             # Valtio state stores (workspace, tabs, etc.)
  ├── lib/                # Utilities (platform, math, etc.)
  └── types/              # TypeScript definitions
```

## Notes
*   **Migration:** This project was migrated from Tauri. You might see references to `src-tauri` or `tauri.conf.json`, but the active build system is **Electron Forge**.
*   **Strict Mode:** React StrictMode is active. Be aware of double-mounting effects, especially when dealing with native resource allocation (like spawning PTYs or creating BrowserViews).
