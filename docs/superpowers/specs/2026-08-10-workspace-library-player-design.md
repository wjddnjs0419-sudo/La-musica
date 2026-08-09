# Workspace Library + Player Design

## Goal

Bring the `workspace_renew` Library and player visual language into the existing `/workspace` while preserving every live data, playback, generation, search, pagination, and track-management flow.

## Library

- Use the near-black editorial workspace shell with a wide content column.
- Present `Library` and `My music` at the top, with the existing Create song action beside it.
- Replace isolated rounded cards with bordered list rows: play state, 56px square artwork, title and generated date, duration, and the existing action menu.
- Keep in-progress and failed music inside the same row system. Existing rename, download, delete, optimistic generation rows, pagination, and search filtering remain available.
- On mobile, hide secondary date/duration columns while retaining artwork, title, play state, generation state, and actions.

## Mini Player

- Render a fixed bottom playback bar above the workspace edge rather than a card in the document flow.
- Desktop uses a three-part composition: active track at left, previous/play-next at center, progress/time/volume/close at right.
- Mobile uses a compact bar and keeps full-player expansion, play/pause, and close accessible.
- Do not change audio element ownership or callbacks in `WorkspaceShell`.

## Full-screen Player

- Preserve the portal, scroll lock, current track, play state, seek, previous/next, and volume behavior.
- Desktop with lyrics uses a spacious two-column composition: sharp large artwork and track metadata at left; a naturally scrolling static lyrics column at right.
- Use the current artwork as a strongly darkened, blurred ambient backdrop; never introduce a fixed color theme.
- Instrumental/no-lyric tracks remove the empty lyric column and enlarge/center the artwork composition with a subtle instrumental label.
- Mobile stacks artwork, title, progress/controls, then lyrics.
- Do not add karaoke timing, waveform, shuffle, repeat, or new audio behavior.
