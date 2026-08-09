# Mobile Player Controls Density Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Pull the footer upward for mobile tracks without lyrics and center the mobile Lyrics trigger.

**Architecture:** Use the existing `hasLyrics` conditional to select mobile main flex growth. Apply only mobile-first utility classes in `FullScreenPlayer`; `lg` desktop behavior remains unchanged.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS.

## Global Constraints

- No-lyrics/instrumental mobile main content uses natural height.
- Lyrics-enabled mobile main retains `flex-1` for its sheet.
- The Lyrics trigger remains in-flow and centered.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Adjust mobile player growth and trigger alignment

**Files:**

- Modify: `components/player/FullScreenPlayer.tsx`
- Create: `docs/superpowers/plans/2026-08-10-mobile-player-controls-density.md`

- [ ] **Step 1: Make main grow only for lyrics-enabled mobile tracks**

Replace the unconditional mobile `flex-1` main class with `${hasLyrics ? "flex-1" : "flex-none"}`, preserving the `lg:flex-1` override and all desktop grid classes.

- [ ] **Step 2: Center the in-flow Lyrics trigger**

Add `mx-auto` to the existing mobile Lyrics button class; retain its margin, action, accessibility state, and `lg:hidden` rule.

- [ ] **Step 3: Verify and commit only player-owned files**

Run `npm run build`, `npm run lint`, and `git diff --check`. Stage only this plan and `components/player/FullScreenPlayer.tsx`, then commit with `fix(player): compact mobile control spacing`.
