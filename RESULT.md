# RESULT: CTA Background Refresh - 2026-08-10

## Background

The landing CTA had a plain near-black surface despite the renewed studio photography elsewhere in the product. The supplied blue-and-amber image has a dark center that can support the existing CTA copy without changing its interaction model.

## Implementation

- Added the supplied 1672×941 studio image as a local public asset.
- Changed `CtaSection` into a layered, overflow-hidden surface using decorative `next/image` fill rendering, a centered cover crop, and a subtle black contrast overlay.
- Preserved the existing CTA copy, spacing, button styling, and authenticated/anonymous CTA behavior.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `git diff --check` | Passed |

## Lessons

- A decorative image should stay out of the accessibility tree and use an overlay only as strong as text contrast requires.
