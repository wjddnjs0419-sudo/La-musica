# Mobile Player Artwork Density Design

## Goal

Use the available mobile full-screen player space for larger artwork and remove the visually disconnected gap between track metadata and the Lyrics trigger.

## Layout

- On mobile, enlarge the artwork from its conservative cap to a cover-forward width of roughly 82–84% of the viewport, bounded by a practical maximum.
- Keep the artist label, title, and duration immediately after the artwork.
- Place the upward Lyrics trigger directly after the duration with a compact top margin, rather than absolutely anchoring it at the bottom of the main region.
- Keep the fixed progress and transport footer unchanged. The Lyrics sheet still opens above that footer.

## Preservation

- The trigger remains absent when a track has no parsed lyrics or is instrumental.
- Desktop artwork limits, desktop two-column lyrics, sheet behavior, audio controls, and portal behavior remain unchanged.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
