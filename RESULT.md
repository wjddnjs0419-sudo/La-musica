# RESULT: Main-page LineWaves CTA section - 2026-06-13

## Background
- Request: add a CTA section to the main page using the reactbits `LineWaves` WebGL background (props supplied by user).
- Constraint: componentize, Tailwind only, no inline styles.

## Implementation
- **`components/LineWaves.tsx`**: ported the reactbits ts-tailwind `LineWaves` source (OGL shader). Added `"use client"`. Reordered init so `program` is created before `resize()`, allowing `const` (satisfies `prefer-const`). Container uses Tailwind `h-full w-full`, no inline styles.
- **`components/cta-section.tsx`**: full-width section. `LineWaves` sits in a `pointer-events-none absolute inset-0 -z-10` background layer with the user-supplied props (color1 `#00296a`, color2 `#a4aab2`, color3 `#6c7d98`, brightness 0.2, rotation -45, mouse interaction on). Centered copy overlay is `pointer-events-none`; the reused `GetStartedBadge` (`/auth`) wrapper is `pointer-events-auto`.
- **Copy**: headline "Your next track starts here." + subtext + Get Started button.
- **`app/page.tsx`**: render `<CtaSection />` below `<HeroSection />`.
- **Dependency**: added `ogl`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| LineWaves + CTA | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- reactbits ships a `ts-tailwind` variant (`src/ts-tailwind/Backgrounds/<Name>/<Name>.tsx`) — already Tailwind, no inline styles; just add `"use client"` and the `ogl` dep.
- ESLint `prefer-const` fires on `let x; ... x = ...` assigned once; create the value before any closure that reads it so it can be `const`.

## Deployment
- Frontend change only; not yet released. Commit/push pending.
