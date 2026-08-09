# Workspace Mobile Density Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Give every mobile Create Song editor step a stable dialog frame and improve mobile workspace list density without changing existing product behavior.

**Architecture:** In `CreateSongModal`, separate the editor body from its action footer inside one viewport-bounded flex frame. Use mobile-first Tailwind overrides in workspace navigation, library shell, list rows, and mini player; existing desktop values remain on `sm`/`md`/`lg` breakpoints.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.

## Global Constraints

- Mobile Create Song dialog uses `min(760px, calc(100dvh - 1rem))` for every editor step; header, step navigation, and action footer do not scroll.
- The active editor body is the sole modal scroll owner.
- Mobile workspace keeps title/Create together; count and full-width search are stacked; desktop horizontal layout is preserved from `sm`.
- Compact navbar, library padding, rows, and mini player only below `sm`; retain usable play/menu controls.
- Do not alter generation, lyrics assistant, credits, search, pagination, track actions, audio, or full-screen-player behavior.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Stabilize the mobile Create Song editor frame

**Files:**

- Modify: `components/workspace/CreateSongModal.tsx`

**Interfaces:**

- Consumes: Existing `CreateSongModal` state, callbacks, steps, and phase rendering.
- Produces: The same modal API with viewport-bounded editor height and a fixed action footer.

- [ ] **Step 1: Add one mobile viewport-bounded editor height**

Set the editor dialog's base height and max height to `min(760px, calc(100dvh - 1rem))`; keep its rounded mobile bottom-sheet edge and existing desktop height overrides.

- [ ] **Step 2: Separate the scrollable Step body from the action footer**

Inside the right editor column, create a `min-h-0 flex flex-1 flex-col` wrapper. Keep Step content and error feedback in a `custom-scrollbar min-h-0 flex-1 overflow-y-auto` child. Move the existing Back/Continue/Create footer to a `shrink-0` sibling with its own border and padding. Keep all current buttons, validation, and callbacks unchanged.

### Task 2: Compact the mobile workspace reading frame

**Files:**

- Modify: `components/workspace-navbar.tsx`
- Modify: `components/workspace/WorkspaceShell.tsx`
- Modify: `components/workspace/TrackList.tsx`
- Modify: `components/workspace/TrackCard.tsx`
- Modify: `components/player/MiniPlayer.tsx`

**Interfaces:**

- Consumes: Existing Workspace state and component props without changes.
- Produces: The same visual components with denser mobile-only Tailwind layout rules.

- [ ] **Step 1: Compress mobile navbar and library heading/filter spacing**

Use a 64px mobile navbar with 16px horizontal inset and restore current 90px dimensions from `sm`. Change the library canvas to 16px mobile inset and compact vertical spacing. Keep the heading and Create control on one row; make the count/search filter `flex-col` below `sm`, with a full-width search, then restore the existing horizontal arrangement at `sm`.

- [ ] **Step 2: Reduce mobile list and mini-player footprint**

Reduce only the base track skeleton/card grid height, thumbnail size, gaps, and vertical padding; preserve `sm` desktop/tablet values and existing controls. Reduce the mobile mini-player wrapper inset, card margin, and internal row spacing while retaining its current desktop grid from `lg`.

### Task 3: Verify and record the mobile density refresh

**Files:**

- Modify: `PLAN.md`
- Modify: `RESULT.md`
- Modify: `RESULT_ARCHIVE.md`

- [ ] **Step 1: Run production and static verification**

Run `npm run build`, `npm run lint`, and `git diff --check`. Build must succeed, lint must have no errors, and diff check must be clean.

- [ ] **Step 2: Complete tracking and commit**

Move the active item to `## Done`, remove the oldest Done entry to keep ten or fewer, archive the previous `RESULT.md` at the top of `RESULT_ARCHIVE.md`, write a new `RESULT.md` with background, implementation, verification matrix, and lesson, then commit all changed files with `fix(workspace): improve mobile density`.
