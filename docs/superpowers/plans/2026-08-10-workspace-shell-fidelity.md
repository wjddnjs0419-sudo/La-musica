# Workspace Shell Fidelity Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Match the approved workspace prototype’s shell, Library, account menu, composer/player bars, and credit modal without changing existing business flows.

**Architecture:** `WorkspaceShell` continues to own track and audio state; `workspace-shell.tsx` supplies the live credit balance to both header and modal. The existing checkout, coupon, search, profile, and Create Song callbacks remain their source of truth while their host components adopt prototype geometry and colors.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, existing workspace APIs.

## Global Constraints

- Keep existing checkout endpoint, coupon redemption endpoint, generation modal, audio callbacks, and sign-out form.
- Use a near-black `#050505` foundation, `#f4f1ea` primary controls, and fine monochrome borders.
- Keep mobile controls usable when the desktop shell collapses.

---

### Task 1: Header and Library frame

**Files:**
- Modify: `app/workspace/page.tsx`
- Modify: `components/workspace-navbar.tsx`
- Modify: `components/workspace-shell.tsx`
- Modify: `components/workspace/WorkspaceShell.tsx`

**Interfaces:** Existing credit modal and search events; add live `remainingCredit` display to the header.

- [ ] Replace the rounded header/search treatment with the prototype’s 90px bordered header, Credits balance action, and restrained profile menu.
- [ ] Move the search UI into Library beside the live generated-track count, retaining the same filter state.
- [ ] Restore the wide desktop spacing and near-black foundation.

### Task 2: Composer and playback bars

**Files:**
- Modify: `components/workspace/MusicComposer.tsx`
- Modify: `components/workspace/WorkspaceShell.tsx`
- Modify: `components/player/MiniPlayer.tsx`

**Interfaces:** Existing Create modal open callback and MiniPlayer props.

- [ ] Restore a fixed composer bar above the fixed player bar, retaining the Create modal open behavior.
- [ ] Reserve scroll space for either one or both fixed bars.
- [ ] Match the two-bar borders, monochrome color, and desktop alignment from the reference.

### Task 3: Credit modal

**Files:**
- Modify: `components/credit-modal.tsx`
- Modify: `components/workspace-shell.tsx`

**Interfaces:** Existing `CREDIT_PLANS`, checkout callback, coupon callback, and `onCreditRedeemed` callback; add an optional numeric `creditBalance` prop.

- [ ] Render the live balance in the modal heading.
- [ ] Replace rounded card styling with three large bordered plan panels and reference button hierarchy.
- [ ] Keep coupon success/error and checkout errors visible inside the revised layout.

### Task 4: Verification

- [ ] Run `npm test`, `npm run build`, `npm run lint`, and `git diff --check`.
