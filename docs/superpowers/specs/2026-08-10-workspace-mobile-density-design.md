# Workspace Mobile Density Design

## Goal

Make the mobile Create Song flow visually stable across all steps and make the mobile workspace feel less cramped without changing music, search, credit, or playback behavior.

## Create Song Modal

- At viewports below the desktop grid breakpoint, the dialog uses one viewport-bounded height for every editor state: `min(760px, calc(100dvh - 1rem))`.
- The mobile dialog remains a bottom sheet with a rounded top edge. Desktop keeps its existing centered fixed-height frame.
- The title header, horizontal three-step navigation, and action footer are non-scrolling regions.
- Only the active Step body scrolls. Lyrics, Simple Sound, Advanced Sound, and Create therefore cannot alter the dialog exterior height.
- The existing Step navigation, validation, assistant, generation states, credits, and submission behavior remain unchanged.

## Workspace Mobile Layout

- Compact the workspace navbar below `sm` from 90px to 64px and reduce horizontal spacing while retaining credits and account access.
- Reduce the mobile library canvas inset to 16px and tighten its vertical spacing. Desktop values remain unchanged.
- Keep the library title and Create control on one compact row. Place the track count and full-width search control in a vertically stacked mobile filter block; restore the current horizontal arrangement at `sm`.
- Reduce the mobile track-row grid, thumbnail, gaps, and vertical padding enough to show more tracks without reducing interactive controls below practical touch targets.
- Tighten the mobile mini-player outer inset and vertical padding. Desktop player layout remains unchanged.

## Non-Goals

- Do not alter generation request mapping, lyrics assistant interaction, credit handling, list search, pagination, track actions, audio ownership, or full-screen playback.
- Do not change desktop Create Song layout, desktop library reading frame, or desktop player controls.

## Verification

- Run `npm run build`.
- Run `npm run lint` and confirm no new errors.
- Run `git diff --check`.
