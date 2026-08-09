# CTA Background Refresh Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Apply the supplied studio image as the landing CTA's readable, responsive background without changing CTA behavior.

**Architecture:** Store the supplied image in `public/images` and render it with Next.js `Image` as a decorative `fill` layer. Keep `CtaSection`'s authenticated and unauthenticated CTA selection untouched, adding only an overlay and a raised content layer.

**Tech Stack:** Next.js 16 App Router, React 19, `next/image`, Tailwind CSS.

## Global Constraints

- Preserve the existing eyebrow, headline, supporting copy, button style, props, and authentication-dependent CTA behavior.
- Use the supplied image as a local public asset and render it as decorative content with empty alt text.
- Use centered `object-cover` at every viewport size and preserve the existing CTA vertical spacing.
- Add only a subtle black contrast overlay; do not hide the blue-and-amber edge lighting.
- Validate with `npm run build`, `npm run lint`, and `git diff --check`.

---

### Task 1: Add the CTA image and layered section rendering

**Files:**

- Create: `public/images/cta-studio-ambient.png`
- Modify: `components/cta-section.tsx`
- Modify: `PLAN.md`

**Interfaces:**

- Consumes: `CtaSection({ ctaHref?: string; authAwareCta?: boolean })` and the supplied PNG source image.
- Produces: The same `CtaSection` public interface with an image, overlay, and above-layer content hierarchy.

- [ ] **Step 1: Copy the supplied image into the public image asset directory**

Run `cp` from the supplied temporary path to `public/images/cta-studio-ambient.png`. Confirm the file exists and remains a 1672×941 PNG.

- [ ] **Step 2: Add decorative image and contrast layers to `CtaSection`**

Import `Image` from `next/image`. Make the section relative and overflow-hidden; place an empty-alt `Image` with `fill`, `sizes="100vw"`, and `object-cover object-center` as the first child; add an `aria-hidden` black 30% overlay; preserve the existing CTA ternary, copy, and spacing inside a `relative z-10` wrapper.

- [ ] **Step 3: Run production and static checks**

Run `npm run build`, `npm run lint`, and `git diff --check`. Build must succeed, lint must have no errors, and the diff check must be clean.

- [ ] **Step 4: Record completion and commit**

Move the tracker item to `## Done`, update `RESULT.md` with background, implementation, verification matrix, and lesson, archive the previous result in `RESULT_ARCHIVE.md`, retaining at most ten Done entries. Commit the asset, component, planning/tracking, and result files with `feat(landing): add CTA studio background`.
