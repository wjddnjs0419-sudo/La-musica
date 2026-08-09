# Mobile Lyrics Sheet Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Let mobile users open a large synchronized lyrics sheet while keeping full-screen playback controls visible.

**Architecture:** Add player-local sheet state to `FullScreenPlayer`. Mobile hides the existing inline lyrics panel and exposes an upward Lyrics trigger in the main player region; the sheet is absolutely contained by that region, so the outer header and footer remain outside it. The existing inline panel remains active at `lg` and `LyricsView` stays the sole lyrics-scroll owner.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS.

## Global Constraints

- Show the mobile trigger only for non-instrumental tracks with parsed lyrics.
- The sheet ends directly above the playback footer; progress and transport controls stay visible and interactive.
- The sheet has `Lyrics`, a downward-arrow close control, and a tappable backdrop.
- Reuse `LyricsView` unchanged for active-line timing, auto-centering, and manual scrolling.
- Reset the sheet to closed when the active track changes or the player unmounts.
- Keep desktop two-column inline lyrics and all audio/portal callbacks unchanged.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Add mobile sheet state and trigger

**Files:**

- Modify: `components/player/FullScreenPlayer.tsx`

**Interfaces:**

- Consumes: Existing `FullScreenPlayerProps`, `hasLyrics`, lyric timing, and `LyricsView`.
- Produces: The unchanged public player API with internal `lyricsSheetOpen` state for mobile sheet visibility.

- [ ] **Step 1: Add player-local sheet lifecycle state**

Declare `const [lyricsSheetOpen, setLyricsSheetOpen] = React.useState(false)` and reset it in an effect keyed by `track.id`. Do not add props or move state into `WorkspaceShell`.

- [ ] **Step 2: Replace mobile inline lyrics with an upward trigger**

Hide the existing inline lyric section below `lg`. Make the main region relative and add a mobile-only button when `hasLyrics` is true, positioned above the footer with an upward chevron, `Lyrics` label, and `aria-expanded={lyricsSheetOpen}`.

### Task 2: Render the bounded lyrics sheet

**Files:**

- Modify: `components/player/FullScreenPlayer.tsx`

**Interfaces:**

- Consumes: `lyricsSheetOpen`, `setLyricsSheetOpen`, `lyricLines`, and `currentTime`.
- Produces: A mobile-only sheet inside the main region; its bottom boundary is the fixed playback footer.

- [ ] **Step 1: Add a tappable backdrop and upward sheet layer**

When open, render an absolute mobile-only backdrop button that closes the sheet, then an `absolute inset-x-0 bottom-0 z-20 h-[88%]` sheet with a near-black background, top border, and rounded top corners. Do not render either layer at `lg` or above.

- [ ] **Step 2: Add sheet header and lyric scroll body**

Render a non-scrolling header containing `Lyrics` and a downward-chevron `Close lyrics` button. Place `LyricsView` in the remaining `min-h-0 flex-1 overflow-hidden` body, passing the same lines and current-time values used by desktop.

### Task 3: Verify and commit only player-owned files

**Files:**

- Create: `docs/superpowers/plans/2026-08-10-mobile-lyrics-sheet.md`
- Modify: `components/player/FullScreenPlayer.tsx`

- [ ] **Step 1: Run production and static verification**

Run `npm run build`, `npm run lint`, and `git diff --check`. Build must succeed, lint must have no errors, and diff check must be clean.

- [ ] **Step 2: Commit without absorbing concurrent unrelated worktree changes**

Stage only `components/player/FullScreenPlayer.tsx` and this plan, then commit with `feat(player): add mobile lyrics sheet`. Do not stage concurrently modified CTA, OG, metadata, or result-tracking files.
