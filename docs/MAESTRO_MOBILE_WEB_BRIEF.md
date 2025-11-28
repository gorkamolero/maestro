# Maestro Mobile Web Redesign Brief

## Your Task

Redesign the Maestro mobile web experience. You're building a companion interface for a desktop workspace orchestrator - not a full port, but a focused mobile experience for monitoring and light interaction.

---

## What is Maestro?

Maestro is a desktop app (Electron) that acts as a workspace orchestrator and AI agent command center. Think Arc browser meets a Control Room:

- **Spaces**: Work contexts (like browser profiles) containing tabs, connected repos, and agent sessions
- **Tabs**: Browser, Terminal, Notes, Tasks, App Launcher - unified in one system
- **Agent Vault**: Monitors AI coding agents (Claude Code, Codex CLI, Gemini CLI) running in your projects
- **Stack Browser**: Native BrowserViews positioned by React/Yoga layout engine

The desktop app is information-dense, keyboard-driven, and built for power users.

---

## Mobile Web Goals

### Primary Use Cases

1. **Monitor agent sessions** - See what Claude Code / Codex / Gemini are doing across your projects
2. **Quick approvals** - Approve/reject agent permission requests when away from desk
3. **Glance at spaces** - See warmth/activity across work contexts
4. **Capture ideas** - Quick note capture that syncs to a space

### Non-Goals (for now)

- Full browser functionality
- Terminal interaction
- Complex editing
- App launching

### User Scenario

Developer is at lunch, gets a notification that Claude Code needs approval. They open Maestro mobile, see the agent is asking to run `rm -rf node_modules && npm install`, tap Approve, and go back to eating.

---

## Information Architecture

### Bottom Navigation (4 items)

```
┌─────────────────────────────────────────┐
│                                         │
│              [Content Area]             │
│                                         │
├─────────┬─────────┬─────────┬──────────┤
│  Spaces │  Agents │  Notes  │   You    │
│    ◇    │    ●    │    ◇    │    ◇     │
└─────────┴─────────┴─────────┴──────────┘
```

- **Spaces**: Grid of space cards with warmth indicators
- **Agents**: Live feed of agent activity (primary view)
- **Notes**: Quick capture + recent notes
- **You**: Settings, sync status, profile

### Agent Feed (Primary Screen)

This is the main event. Shows all active agent sessions across all spaces:

```
┌─────────────────────────────────────────┐
│ Agents                            ⚡ 3  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🟡 Claude Code          maestro/   │ │
│ │ Waiting for approval               │ │
│ │ "Run: npm install framer-motion"   │ │
│ │                                     │ │
│ │           [Deny]  [Approve]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 Claude Code           rody-api/ │ │
│ │ Writing tests...                   │ │
│ │ "Modified: src/auth/oauth.test.ts" │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ Codex                   game-jam │ │
│ │ Idle (2 hours ago)                 │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Spaces │  Agents │  Notes  │   You    │
└─────────────────────────────────────────┘
```

### Agent States

| State | Indicator | Description |
|-------|-----------|-------------|
| Needs Input | 🟡 Yellow pulse | Waiting for user approval/input |
| Running | 🟢 Green | Actively working |
| Thinking | 🔵 Blue pulse | Processing, about to act |
| Error | 🔴 Red | Something failed |
| Idle | ⚪ Gray | Session exists but inactive |
| Completed | ✓ Checkmark | Task finished |

### Spaces View

Simplified grid showing space health at a glance:

```
┌─────────────────────────────────────────┐
│ Spaces                                  │
├─────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐       │
│ │ ▌Maestro    │  │ ▌Rody       │       │
│ │ 🟡 1 agent  │  │ 🟢 2 agents │       │
│ │ ●●●○○ tabs  │  │ ●●●●○ tabs  │       │
│ │ 2m ago      │  │ active      │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
│ ┌─────────────┐  ┌─────────────┐       │
│ │ ▌Game Jam   │  │ ▌Music      │       │
│ │ ⚪ idle     │  │ no agents   │       │
│ │ ●○○○○ tabs  │  │ ●●○○○ tabs  │       │
│ │ 3h ago      │  │ 1d ago      │       │
│ └─────────────┘  └─────────────┘       │
│                                         │
├─────────────────────────────────────────┤
│  Spaces │  Agents │  Notes  │   You    │
└─────────────────────────────────────────┘
```

The colored bar (▌) on each card is the space's identifying color.

### Space Detail (Tap on a space)

```
┌─────────────────────────────────────────┐
│ ← Maestro                               │
├─────────────────────────────────────────┤
│                                         │
│ Agents                                  │
│ ┌─────────────────────────────────────┐ │
│ │ 🟡 Claude Code - Waiting            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Recent Notes                            │
│ • Fix the portal z-index issue          │
│ • Add warmth indicator to cards         │
│                                         │
│ Tabs (5)                                │
│ 🌐 GitHub PR #234                       │
│ 📝 Architecture notes                   │
│ 💻 Terminal (zsh)                       │
│ 🤖 Agent session                        │
│ 🌐 Tailwind docs                        │
│                                         │
├─────────────────────────────────────────┤
│  Spaces │  Agents │  Notes  │   You    │
└─────────────────────────────────────────┘
```

### Quick Note Capture

```
┌─────────────────────────────────────────┐
│ Notes                            + New  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ What's on your mind?                │ │
│ │                                     │ │
│ │                                     │ │
│ │ Space: [Maestro ▼]         [Save]   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Recent                                  │
│ ┌─────────────────────────────────────┐ │
│ │ Fix portal z-index          2h ago  │ │
│ │ in Maestro                          │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ OAuth flow diagram          5h ago  │ │
│ │ in Rody                             │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│  Spaces │  Agents │  Notes  │   You    │
└─────────────────────────────────────────┘
```

---

## Design Language

### Colors

**Backgrounds** (warm dark, not cold gray):
```css
--bg-primary: oklch(0.18 0.01 60);      /* Main background */
--bg-card: oklch(0.20 0.01 60);         /* Cards */
--bg-elevated: oklch(0.24 0.01 60);     /* Modals, sheets */
```

**Text**:
```css
--text-primary: oklch(0.85 0.01 60);    /* Primary */
--text-secondary: oklch(0.55 0.01 60);  /* Muted */
--text-tertiary: oklch(0.40 0.01 60);   /* Hint */
```

**Status colors** (muted, not screaming):
```css
--status-success: oklch(0.65 0.15 145); /* Green */
--status-warning: oklch(0.70 0.15 85);  /* Yellow/amber */
--status-error: oklch(0.60 0.20 25);    /* Red */
--status-info: oklch(0.65 0.12 250);    /* Blue */
```

### Typography

- Font: Inter (system fallback: -apple-system)
- Base size: 15px (mobile-optimized)
- Line height: 1.5

| Element | Size | Weight |
|---------|------|--------|
| Body | 15px | 400 |
| Small | 13px | 400 |
| Label | 13px | 500 |
| Card title | 15px | 500 |
| Section header | 13px | 600 |
| Page title | 18px | 600 |

### Spacing

Base unit: 4px. Use multiples: 4, 8, 12, 16, 24, 32.

- Card padding: 16px
- Card gap: 12px
- Section gap: 24px
- Screen padding: 16px

### Touch Targets

- Minimum: 44px × 44px
- Buttons: 48px height minimum
- List items: 56px height minimum

### Corners

- Cards: 12px
- Buttons: 8px
- Input fields: 8px
- Bottom sheet: 16px (top corners only)

### Borders

Minimal. Use 1px borders at ~8% white opacity only when necessary for separation.

```css
border: 1px solid rgba(255, 255, 255, 0.08);
```

### Shadows

```css
/* Cards */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

/* Bottom sheet */
box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
```

---

## Interaction Patterns

### Navigation

- Bottom tab bar (fixed)
- Back button for drill-down views
- No hamburger menus
- No side drawers

### Agent Approval Flow

1. Card shows pending state with yellow indicator
2. Tap card → expands inline or opens bottom sheet
3. Shows full context: command, files affected, reasoning
4. Two buttons: Deny (ghost) and Approve (filled)
5. Haptic feedback on action
6. Card updates immediately, optimistic UI

### Pull to Refresh

Standard iOS/Android pull-to-refresh on all list views.

### Empty States

Every screen needs an empty state:
- Agents: "No active agents. Start one from the desktop app."
- Spaces: "No spaces yet. Create one on desktop."
- Notes: "No notes. Tap + to capture something."

### Loading States

- Skeleton cards for initial load
- Inline spinners for actions
- Never block the whole screen

---

## Technical Constraints

### Stack

- React (consistent with desktop)
- Tailwind CSS
- Framer Motion (light usage)
- PWA-capable (but not required for v1)

### Sync

- Real-time via WebSocket to desktop app
- Desktop app is the source of truth
- Mobile can send: approvals, new notes
- Mobile receives: space state, agent events, notes list

### Offline

- Show last-known state when offline
- Queue approvals/notes for when connection returns
- Clear "Offline" indicator in header

---

## Deliverables

1. **Figma/design files** - All screens at mobile viewport (390px width)
2. **Component specs** - Button variants, card types, inputs
3. **Interaction notes** - Transitions, gestures, feedback
4. **Asset exports** - Icons at 1x, 2x, 3x

---

## Reference

### Inspiration

- **Linear mobile** - Clean, fast, focused
- **GitHub mobile** - Good notification/approval patterns
- **Slack mobile** - Bottom nav, quick actions
- **Raycast** - Keyboard-first but works on mobile

### Avoid

- Cramming desktop features into mobile
- Tiny touch targets
- Bright/saturated colors
- Heavy animations
- Complex gestures

---

## Questions to Answer

1. How do we handle multiple pending approvals? Stack? Queue?
2. Should notes support rich text or just plain text on mobile?
3. Do we need a notification permission prompt flow?
4. How prominent should the sync status indicator be?

---

*Build something that feels native, loads fast, and does one thing well: keep developers connected to their agents when away from their desk.*
