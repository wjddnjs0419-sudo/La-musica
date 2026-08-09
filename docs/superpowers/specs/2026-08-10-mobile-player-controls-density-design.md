# Mobile Player Controls Density Design

## Goal

Remove unused vertical space before the playback footer for instrumental and no-lyrics tracks, and restore centered alignment for the mobile Lyrics trigger.

## Layout Rules

- For mobile tracks without parsed lyrics, including instrumental tracks, the main player content uses its natural height rather than filling the remaining viewport. The progress and playback footer follows directly after the metadata.
- Tracks with lyrics keep their remaining-space main region because the Lyrics sheet needs that containing area.
- The mobile Lyrics trigger stays in normal flow after duration but is horizontally centered within the player.

## Preservation

- Desktop layout and controls remain unchanged.
- Artwork, metadata, footer content, sheet behavior, playback callbacks, and lyrics timing remain unchanged.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
