# Legal Pages Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Restyle Privacy Policy and Terms of Service through their shared page shell while preserving their legal content and routes.

**Architecture:** `components/legal-page.tsx` remains the sole presentation layer consumed by both server-rendered route pages. It will supply the new header, article frame, and typographic treatment without changing route props or their child content.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS.

## Global Constraints

- Preserve every legal document word, metadata, email link, and route.
- Do not render the Footer.
- Use `#050505` foundation, `#f4f1ea` primary text, and thin monochrome borders.
- Keep semantic `main`, `header`, `article`, sections, headings, lists, and links.

---

### Task 1: Shared Legal Page Presentation

**Files:**
- Modify: `components/legal-page.tsx`

**Interfaces:**
- Consumes: unchanged `LegalPageProps` (`title`, `updatedAt`, optional `intro`, `children`).
- Produces: a shared dark editorial shell for both existing routes.

- [ ] **Step 1: Replace the legacy slate/gradient shell**

Use the existing logo and Home route inside a 90px near-black header with a bottom border; add no client state or Footer.

- [ ] **Step 2: Build the legal reading hierarchy**

Render a `LEGAL` eyebrow, title, date, optional intro, divider, and a 760px maximum reading column with 16px body text and restrained section heading/list/link styling.

- [ ] **Step 3: Verify the production surface**

Run: `npm run build && npm run lint && git diff --check`

Expected: successful build, no new lint errors, and no whitespace errors.
