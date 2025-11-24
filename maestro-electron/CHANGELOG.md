# Changelog

All notable changes to Maestro will be documented in this file.

## [Unreleased]

### Added

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
