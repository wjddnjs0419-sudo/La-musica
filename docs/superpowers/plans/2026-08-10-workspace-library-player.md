# Workspace Library + Player Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Replace the Workspace Library and both player presentations with the approved prototype layout while keeping existing live playback and track flows unchanged.

**Architecture:** `WorkspaceShell` remains the owner of music, audio, generation, filtering, and player state. `TrackList`/`TrackCard` render the Library rows, `MiniPlayer` becomes the fixed compact playback layer, and `FullScreenPlayer` consumes its existing props to render responsive artwork and lyrics compositions.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, existing Music API and HTML audio element.

## Global Constraints

- Do not alter `/api/music/*` endpoints, `GenerateRequest`, polling, audio element lifecycle, or credit behavior.
- Preserve play/pause, seek, previous, next, volume, close, fullscreen expansion, rename, download, delete, search, and pagination.
- Do not add timestamped lyric behavior, waveform, shuffle, repeat, or new audio capabilities.
- Mobile Library hides only secondary metadata; mobile player remains fully operable.

---

### Task 1: Library Shell and Track Rows

**Files:**
- Modify: `components/workspace/WorkspaceShell.tsx`
- Modify: `components/workspace/TrackList.tsx`
- Modify: `components/workspace/TrackCard.tsx`

**Interfaces:**
- Consumes: existing `TrackListProps`, `TrackCardProps`, and callbacks owned by `WorkspaceShell`.
- Produces: the same public props with row-based desktop/mobile Library rendering.

- [ ] **Step 1: Replace Library container heading and content spacing**

Render `Library`/`My music` and retain the existing `MusicComposer` open callback as the Create song action.

- [ ] **Step 2: Convert loading and data rows to the shared bordered row geometry**

Use a consistent grid with play, artwork, title/meta, date, duration, and actions on desktop; collapse metadata columns on mobile.

- [ ] **Step 3: Retain each existing track state and action**

Keep pending spinner, failure label, rename input, action menu, download link, and delete confirmation within the new row without changing callbacks.

- [ ] **Step 4: Run lint for the edited components**

Run: `npm run lint`

Expected: no new lint errors.

### Task 2: Fixed Mini Player

**Files:**
- Modify: `components/workspace/WorkspaceShell.tsx`
- Modify: `components/player/MiniPlayer.tsx`

**Interfaces:**
- Consumes: existing `MiniPlayerProps` and player callbacks from `WorkspaceShell`.
- Produces: a viewport-bottom desktop three-column player and compact mobile player using the exact same callbacks.

- [ ] **Step 1: Reserve scroll content space for the fixed controls**

Add bottom padding to the scrolling Library only when an active track is present, so final rows are never hidden behind player UI.

- [ ] **Step 2: Move mini player into a fixed workspace layer**

Keep it inside `WorkspaceShell`; position it at the bottom without changing its props or audio state owner.

- [ ] **Step 3: Rebuild its visual composition**

Use track art/title left, previous/play-next center, progress/time/volume/close right on desktop; make mobile a single compact accessible row.

- [ ] **Step 4: Run lint for the edited components**

Run: `npm run lint`

Expected: no new lint errors.

### Task 3: Immersive Full-screen Player

**Files:**
- Modify: `components/player/FullScreenPlayer.tsx`

**Interfaces:**
- Consumes: existing `FullScreenPlayerProps`, `LyricsView`, `PlayerProgressBar`, and `VolumeControl`.
- Produces: responsive full-screen artwork/lyrics presentation with unchanged controls.

- [ ] **Step 1: Build desktop lyric and instrumental layouts from existing derived lyrics state**

Show a sharp artwork column and scrollable lyric column when lyric lines exist; render a larger centered artwork with an Instrumental label otherwise.

- [ ] **Step 2: Preserve artwork-derived ambient background and portal behavior**

Keep the existing track thumbnail backdrop but strengthen the near-black overlay; retain body/html scroll locking and `createPortal`.

- [ ] **Step 3: Place existing progress, previous/play-next, and volume controls in a unified lower control area**

Pass the existing current time, duration, seek, play, and navigation callbacks directly into the new composition.

- [ ] **Step 4: Run production verification**

Run: `npm run build && npm run lint && git diff --check`

Expected: successful build, lint with no new errors, and clean diff whitespace.
