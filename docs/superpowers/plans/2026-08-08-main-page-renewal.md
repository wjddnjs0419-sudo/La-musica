# Main Page Renewal Implementation Plan

> **Execution:** Use a single agent by default. Delegate only genuinely independent work; select verification and TDD according to risk.

**Goal:** Deliver a dark, responsive, editorial La Musica homepage that preserves every current business and interaction path.

**Architecture:** Keep `app/page.tsx` as the server entry that reads the existing landing samples. Replace only landing presentation components; client boundaries remain limited to header/menu, sample playback, pricing checkout, and auth-aware CTAs. New static product frames communicate real capabilities without touching the generation API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `next/image`, existing InsForge sample reader, existing Polar checkout.

## Global Constraints

- Base page colour is `#050505`; artwork supplies the expressive accent colour.
- Use existing four pinned sample records, `CREDIT_PLANS`, `/api/credits/checkout`, `/auth`, and `/workspace` as sources of truth.
- Do not add `/create`, a login modal, provider/API changes, or unsupported music controls.
- Use only valid existing footer destinations.
- Preserve one-track-at-a-time, user-initiated sample playback.
- Desktop reference is 1440px and mobile reference is 390px.
- Verify every code change with `npm run build` and `npm run lint`.

---

### Task 1: Establish the landing visual foundation

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: root layout font variables and the existing `getLandingSampleTracks()` server function.
- Produces: shared landing tokens/classes and a server-rendered page composition for later sections.

- [ ] Replace rainbow landing ambient styles with neutral dark tokens, subtle borders, editorial spacing, focus styles, and reduced-motion rules.
- [ ] Add the selected editorial serif font role alongside the existing Geist sans role; retain the root layout’s metadata and global application styling.
- [ ] Remove the obsolete liquid/ambient page wrapper markup and compose the new header, hero, samples, story, product proof, pricing, CTA, and footer in the approved order.
- [ ] Run `npm run lint` and confirm no new lint error is introduced.

### Task 2: Rebuild navigation and hero around the real workspace flow

**Files:**
- Modify: `components/headersection.tsx`
- Modify: `components/herosection.tsx`

**Interfaces:**
- Consumes: `AuthAwareGetStartedBadge`, `GetStartedBadge`, `Logo`, and the existing auth-status request behavior.
- Produces: a sticky responsive header and static hero demo; every Create CTA routes to `/auth` while logged out and `/workspace` when authenticated.

- [ ] Replace the header’s Features/Contact navigation with the approved minimal Pricing, Sign in, and Create structure; keep a keyboard-accessible mobile menu.
- [ ] Remove `LiquidMetal` and its dependency usage from the hero.
- [ ] Build the hero’s three presentational stages — lyric input, generating state, completed track/player — in dark surfaces with fixed demo content and no fake generation action.
- [ ] At mobile widths, place hero copy before a clear vertical flow; at desktop widths, use the two-column composition.
- [ ] Run `npm run lint` and inspect the page at 1440px and 390px in the browser.

### Task 3: Restyle real featured samples without changing playback behavior

**Files:**
- Modify: `components/sample-music-section.tsx`
- Modify: `lib/landing-samples.ts` only if a display-only fallback is needed for missing artwork or duration

**Interfaces:**
- Consumes: `LandingSampleTrack { id, title, description, duration, audioSrc, thumbnailSrc }`.
- Produces: four artwork-forward cards; `handleToggle(track)` remains the sole audio state transition and maintains a single active `HTMLAudioElement`.

- [ ] Keep the current four pinned record IDs, audio URLs, and thumbnail URLs unchanged.
- [ ] Redesign each card to expose artwork, track title, non-fictional “Created with La Musica” provenance, existing prompt-derived description, duration, and a separate play/pause control.
- [ ] Preserve error feedback, no-autoplay behavior, end-state reset, and accessible play/pause labels.
- [ ] Implement a four-column desktop grid and a touch-scrollable, snap-aligned mobile rail without horizontal page overflow.
- [ ] Run `npm run lint` and manually verify play, pause, track switch, completion reset, and unavailable-thumbnail fallback.

### Task 4: Add the explanatory and product-proof sections

**Files:**
- Create: `components/how-it-works-section.tsx`
- Create: `components/product-feature-section.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: shared landing token classes and static presentation data defined inside each component.
- Produces: server-renderable sections with no API calls or mutable generation state.

- [ ] Add the three-step “Write your lyrics / Shape your sound / Get your song” section with desktop dividers and a mobile vertical sequence.
- [ ] Add the “Turn words into music” frame showing lyrics, completed track artwork, and player presentation.
- [ ] Add the “Make it sound like you” frame using only supported controls: genre, mood, vocal, language, use case, and 1/3-minute duration.
- [ ] Use static non-interactive examples and omit unsupported tempo, BPM, style influence, download format tiers, and regenerate actions.
- [ ] Run `npm run lint` and inspect both product frames at 1440px and 390px.

### Task 5: Apply the new pricing, conversion, and footer shell

**Files:**
- Modify: `components/pricing-section.tsx`
- Modify: `components/cta-section.tsx`
- Modify: `components/footer-section.tsx`

**Interfaces:**
- Consumes: `CREDIT_PLANS`, existing `POST /api/credits/checkout`, and `AuthAwareGetStartedBadge`.
- Produces: unchanged checkout/auth behavior in the approved dark visual language.

- [ ] Preserve plan IDs, names, prices, credits, checkout request, pending state, and checkout error state exactly.
- [ ] Replace invented plan benefits with neutral pay-as-you-go copy that does not claim unavailable formats, priority, commercial rights, or remix credits.
- [ ] Restyle the final CTA around “Your song is waiting.” while using the existing auth-aware CTA destination.
- [ ] Restrict footer navigation to Home, Workspace/Create, Pricing, Contact, Privacy, and Terms; retain the large `LA MUSICA` closing type without mobile overflow.
- [ ] Run `npm run lint` and manually verify unauthenticated pricing selection redirects to `/auth` and header/final CTA preserve existing auth-aware destinations.

### Task 6: Validate the finished renewal and record it

**Files:**
- Modify: `PLAN.md`
- Modify: `RESULT.md`
- Modify: `RESULT_ARCHIVE.md` when replacing the latest result

**Interfaces:**
- Consumes: completed landing components and the repository’s mandatory work-log format.
- Produces: verified completion record.

- [ ] Run `npm run build`; fix any type, Next.js, or production-build failure before proceeding.
- [ ] Run `npm run lint`; fix any newly introduced lint error and record any pre-existing warning separately.
- [ ] Use browser screenshots at 1440px and 390px to check hierarchy, no horizontal overflow, CTAs, keyboard focus, and reduced-motion behavior.
- [ ] Move the prior latest result to `RESULT_ARCHIVE.md`, write the renewal verification matrix to `RESULT.md`, and move this active work from `PLAN.md` to a single `[Done]` summary.
