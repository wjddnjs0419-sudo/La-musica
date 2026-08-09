# Brand Asset Replacement Design

## Goal

Replace the legacy SVG brand assets with the supplied La Musica wordmark and wave-icon PNGs across all visual logo placements.

## Asset Rules

- `public/wordmark.png` is the text wordmark asset.
- `public/logo icon.png` is the wave-icon asset.
- A location that represents the full brand uses both assets together, with the icon before the wordmark.
- A location that represents only an icon uses only `logo icon.png`.
- Service-name copy in body content, metadata, legal text, and the decorative footer background is not a visual logo and remains text.

## Implementation Boundaries

- Refactor the shared `Logo` component to compose the two PNG assets for its horizontal variant and use only the icon PNG for its icon variant.
- Keep the existing `Logo` props and all current logo consumers so headers, workspace navigation, loading UI, contact, legal pages, and footer inherit the replacement without per-page duplication.
- Replace the custom note-and-text lockup in the sign-in modal with the same full `Logo` component.
- Point `Metadata.icons.icon` and `Metadata.icons.apple` to `logo icon.png`; no legacy favicon source remains configured.

## Rendering and Accessibility

- Use local Next.js image rendering with intrinsic dimensions so transparent PNGs retain their proportions.
- Preserve each consumer's existing sizing class; the shared component handles image dimensions without layout shift.
- The composed full logo exposes one accessible name. Its individual image layers are decorative; an icon-only logo exposes its provided title.
- The metadata icon remains an icon-only asset.

## Verification

- Run `npm run build` to validate metadata and all visual logo consumers.
- Run `npm run lint` to confirm no new lint errors.
- Run `git diff --check`.
