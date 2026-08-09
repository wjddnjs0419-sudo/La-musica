# Mobile Player Artwork Density Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Enlarge the mobile player artwork and keep the Lyrics trigger directly connected to track metadata.

**Architecture:** Adjust only mobile-first classes in `FullScreenPlayer`; desktop `lg` artwork limits and sheet behavior are unchanged.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS.

## Global Constraints

- Use a mobile artwork cap around 84vw with a practical pixel maximum.
- Render the Lyrics trigger in normal document flow immediately after duration on mobile.
- Keep the footer, lyrics sheet, desktop grid, and playback callbacks unchanged.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Tighten mobile artwork and Lyrics flow

**Files:**

- Modify: `components/player/FullScreenPlayer.tsx`
- Create: `docs/superpowers/plans/2026-08-10-mobile-player-artwork-density.md`

**Interfaces:**

- Consumes: Existing `hasLyrics`, `lyricsSheetOpen`, and player callbacks.
- Produces: The same player API with a larger mobile cover and in-flow Lyrics trigger.

- [ ] **Step 1: Enlarge the mobile square artwork**

Replace `max-w-[min(68vw,320px)]` with `max-w-[min(84vw,440px)]`, retaining the existing `lg` artwork sizes.

- [ ] **Step 2: Move the mobile trigger into track metadata**

Render the existing upward-chevron Lyrics button after the duration paragraph inside the artwork metadata block with a compact top margin. Remove its absolute bottom positioning; retain `lg:hidden`, label, click handler, and availability guard.

- [ ] **Step 3: Verify and commit only player-owned changes**

Run `npm run build`, `npm run lint`, and `git diff --check`. Stage only this plan and `components/player/FullScreenPlayer.tsx`, then commit with `fix(player): tighten mobile artwork layout`.
