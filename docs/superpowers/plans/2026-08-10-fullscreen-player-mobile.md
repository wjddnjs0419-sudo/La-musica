# Full-Screen Player Mobile Isolation Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Prevent the workspace from showing through the mobile full-screen player and keep artwork, metadata, lyrics, and playback controls in non-overlapping regions.

**Architecture:** Retain the existing portal and audio-control props. Give the full-screen root an opaque base layer, then make the player body a mobile vertical flex layout whose metadata block is fixed-size and whose lyric panel alone grows and scrolls; retain the existing desktop grid with `lg:` overrides.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, React portal.

## Global Constraints

- The full-screen root must have an opaque near-black base; blurred art remains decorative and may not expose the workspace.
- Mobile header and playback footer remain fixed player regions.
- Mobile artwork has a viewport-bounded square size; track metadata follows it before the lyric panel.
- Mobile lyrics consume only remaining space and scroll internally.
- Preserve desktop grid, audio control callbacks, lyrics timing, portal behavior, and previous/next/close controls.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Isolate the full-screen surface and bound mobile content

**Files:**

- Modify: `components/player/FullScreenPlayer.tsx`
- Modify: `PLAN.md`

**Interfaces:**

- Consumes: Existing `FullScreenPlayerProps` without changes.
- Produces: The same portal and control behavior with an opaque background plus mobile bounded artwork, metadata, lyrics, and footer regions.

- [ ] **Step 1: Remove workspace bleed from the player backdrop**

Add `bg-[#090909]` and `isolate` to the fixed player root. Keep the blurred cover-art layer as a decorative absolute child and reduce its black overlay only against that opaque base; do not leave a transparent root surface through which page content can show.

- [ ] **Step 2: Make mobile main layout non-scrolling and vertically bounded**

Below `lg`, replace the main grid's `overflow-y-auto` with a `flex min-h-0 flex-1 flex-col overflow-hidden` layout. Keep the existing `lg:grid`, desktop columns, centered alignment, and desktop overflow rules.

- [ ] **Step 3: Bound the mobile artwork and isolate the lyric scroller**

Give the artwork/metadata section `shrink-0`. On mobile, center the square art and limit it with `max-w-[min(68vw,320px)]`; retain existing desktop artwork maxima under `lg`. Remove the mobile `min-h-[18rem]` lyric requirement and make the lyric section `min-h-0 flex-1 overflow-hidden`, leaving only its inner `LyricsView` wrapper as the scroll owner.

- [ ] **Step 4: Mark the work active in the repository tracker**

Add `모바일 전체화면 플레이어 격리` under `## In Progress` in `PLAN.md` before verification.

### Task 2: Verify and record the isolated mobile player

**Files:**

- Modify: `PLAN.md`
- Modify: `RESULT.md`
- Modify: `RESULT_ARCHIVE.md`

- [ ] **Step 1: Run production and static verification**

Run `npm run build`, `npm run lint`, and `git diff --check`. Build must succeed, lint must have no errors, and diff check must be clean.

- [ ] **Step 2: Complete tracking and commit**

Move the active item to `## Done`, remove the oldest Done entry to keep ten or fewer, archive the previous `RESULT.md` at the top of `RESULT_ARCHIVE.md`, write a new `RESULT.md` with root cause, implementation, verification matrix, and lesson, then commit all changed files with `fix(player): isolate mobile full screen layout`.
