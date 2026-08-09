# Full-Screen Player Mobile Isolation Design

## Goal

Restore a true immersive full-screen player on mobile by preventing the workspace underneath from showing through and by giving mobile playback a bounded vertical layout.

## Root Cause

The portal itself covers the viewport, but its near-black overlay uses 75% opacity. This exposes the underlying workspace header and mini player. Below the desktop breakpoint, the player also changes from a two-column layout into an unconstrained vertical stack, so square art, track metadata, and lyrics compete for the same scroll region.

## Mobile Layout

- The full-screen root has an opaque near-black base. Blurred cover art remains a background treatment but never reveals the workspace behind it.
- The header remains fixed within the player: close control on the left and `Now playing` centered.
- The main area is a non-scrolling vertical flex region. Artwork has a viewport-bounded square size; artist, title, and duration follow immediately below it.
- When lyrics exist, only the lyric region consumes remaining space and scrolls internally. The artwork and title do not scroll into or overlap the lyric region.
- The progress and playback controls remain a fixed footer. They do not contain, reveal, or overlap the workspace mini player.

## Desktop Preservation

- Keep the current centered artwork-and-lyrics two-column layout, title metadata, progress controls, and desktop volume control above the desktop breakpoint.
- No audio state, controls, lyrics timing, close, previous/next, or portal behavior changes.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
