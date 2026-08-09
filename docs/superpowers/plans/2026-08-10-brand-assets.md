# Brand Asset Replacement Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Render the supplied La Musica PNG wordmark and icon consistently at every visual brand location.

**Architecture:** Use the existing shared `Logo` component as the only in-app visual logo boundary. Its horizontal variant composes the wave icon and wordmark images, while its icon variant renders only the wave asset; consumers preserve their current sizing classes. App metadata references the icon-only asset.

**Tech Stack:** Next.js 16 App Router, React 19, `next/image`, TypeScript, Tailwind CSS.

## Global Constraints

- `public/wordmark.png` is the text wordmark asset and `public/logo icon.png` is the wave-icon asset.
- Full visual brand locations use the icon before the wordmark; icon-only locations use only the wave icon.
- Service-name copy in body content, metadata, legal text, and the decorative footer background remains text.
- Preserve current `Logo` props and all existing consumer sizing classes.
- The full logo has one accessible name; its inner layers are decorative, and the icon-only logo exposes its supplied title.
- Metadata icon and Apple icon use `logo icon.png`.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Centralize the supplied assets in the shared logo component

**Files:**

- Modify: `components/logo.tsx`
- Modify: `components/auth-context.tsx`

**Interfaces:**

- Consumes: `LogoProps` with `className?: string`, `title?: string`, and `variant?: "icon" | "horizontal"`.
- Produces: The same default `Logo` component API, rendering `/logo icon.png` for icon-only use and both PNGs for horizontal use.

- [ ] **Step 1: Replace legacy SVG source selection with local Next Image rendering**

Import `Image` from `next/image`. For `variant="icon"`, render one image with `src="/logo icon.png"`, `alt={title}`, intrinsic dimensions `303` by `168`, and the caller's class name. For `variant="horizontal"`, render a `role="img"` wrapper with `aria-label={title}` and the caller's class name; inside it render empty-alt icon and wordmark images (`303×168`, `702×262`) in icon-then-wordmark order using `h-full w-auto` styles.

- [ ] **Step 2: Replace the auth modal's custom note-and-text lockup**

Import `Logo` into `components/auth-context.tsx` and replace the note symbol plus `La Musica` text spans with `<Logo variant="horizontal" className="h-8 w-auto" />`. Preserve the modal's centered layout and all authentication behavior.

### Task 2: Use the icon-only asset for browser metadata

**Files:**

- Modify: `app/layout.tsx`

**Interfaces:**

- Consumes: Next.js `Metadata.icons` configuration.
- Produces: `icons.icon` and `icons.apple` entries referencing `/logo icon.png`.

- [ ] **Step 1: Replace legacy favicon and Apple touch-icon metadata**

Set `icons.icon` to one PNG entry with `url: "/logo icon.png"` and `type: "image/png"`; set `icons.apple` to one PNG entry with the same URL and type. Leave titles, descriptions, Open Graph, and Twitter metadata unchanged.

### Task 3: Verify and record the completed brand refresh

**Files:**

- Modify: `PLAN.md`
- Modify: `RESULT.md`
- Modify: `RESULT_ARCHIVE.md`

- [ ] **Step 1: Run production and static verification**

Run `npm run build`, `npm run lint`, and `git diff --check`. Build must succeed, lint must have no errors, and diff check must be clean.

- [ ] **Step 2: Complete project tracking and commit**

Move the active brand asset item to `## Done`, remove the oldest Done item to keep ten or fewer, archive the previous `RESULT.md` at the top of `RESULT_ARCHIVE.md`, write the new `RESULT.md` with background, implementation, verification matrix, and lesson, then commit all changed files with `feat(brand): replace logo assets`.
