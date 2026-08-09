# RESULT: Mobile CTA Background Image - 2026-08-10

## Background

On narrow screens, the landscape CTA image was center-cropped to its dark middle region, making the section appear almost black.

## Implementation

- Moved the supplied 1080×1350 image to `public/images/cta-studio-mobile.png`.
- Use the new portrait image below the `md` breakpoint and retain the existing landscape CTA image at `md` and above.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `git diff --check` | Passed |

## Lessons

- Responsive source selection prevents a landscape image's dark central crop from becoming the whole mobile CTA background.
