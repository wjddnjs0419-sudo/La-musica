# Mobile Lyrics Sheet Design

## Goal

Give lyrics enough readable space in the mobile full-screen player without compromising the current artwork-focused default player or its always-available playback controls.

## Default Mobile Player

- When lyrics exist, remove the inline lyric panel from the default mobile layout.
- Keep the compact artwork, artist/title/duration, player header, progress, and previous/play-next controls.
- Add an upward-arrow Lyrics trigger immediately above the fixed playback footer. The trigger is absent for instrumental tracks and tracks without parsed lyrics.

## Lyrics Sheet

- The trigger opens a mobile-only sheet that rises from the bottom of the player.
- The sheet ends directly above the playback footer, leaving progress and controls visible and interactive at all times.
- It has a compact header with `Lyrics` and a downward-arrow close control. Tapping the uncovered player area also closes the sheet.
- The existing `LyricsView` owns the sheet body, retaining timestamp-based active-line highlighting, automatic active-line centering, and manual scrolling.
- The sheet is a player-local layer, not a separate route or portal; close, track changes, and full-player unmount reset it to closed.

## Desktop Preservation

- Keep the existing desktop two-column inline lyrics panel unchanged.
- Do not change audio state, playback callbacks, lyrics parsing/timing, or the full-screen portal.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
