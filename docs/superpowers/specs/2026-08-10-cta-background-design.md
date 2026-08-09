# CTA Background Refresh Design

## Goal

Replace the landing-page CTA section's plain near-black background with the supplied blue-and-amber studio image while preserving its existing copy, call-to-action behavior, and responsive structure.

## Scope

- Add the supplied image to the app's local public image assets.
- Render it as a full-bleed, decorative background of `CtaSection`.
- Keep the existing eyebrow, headline, supporting copy, and authenticated/anonymous CTA components unchanged.
- Preserve the current vertical spacing and button styling.

## Visual Design

- The section remains full width with its existing top divider.
- The image fills the section with `object-fit: cover`; its center stays aligned with the central dark negative space behind the text.
- A subtle black overlay is layered above the image to preserve readable warm-white text and the white CTA button without hiding the blue and amber edges.
- The image is decorative and has empty alternative text.
- On narrow screens, the image continues to use a centered `cover` crop. No alternate mobile asset is introduced.

## Component Structure

`CtaSection` becomes a relative, overflow-hidden section with three layers:

1. A Next.js `Image` using `fill`, `cover`, and responsive `sizes`.
2. A non-interactive contrast overlay.
3. The current CTA content wrapper raised above both layers.

No CTA props, route behavior, authentication status handling, or copy changes are required.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
