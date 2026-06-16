# Reference Analysis

Purpose: Convert public genre reference material into prompt-safe La Musica guidance.

Scope: The files in this folder match the current Genre dropdown:

- EDM
- Reggaeton
- Hip-hop / Trap
- Techno
- Korean Ballad
- Brazilian Funk
- Afropop Festival
- French Maghreb Hip-hop
- Football Chant

Method:

- Use public Spotify/YouTube/chart/genre-reference pages as discovery sources.
- Do not download or transcribe copyrighted audio.
- Do not copy melodies, lyrics, hooks, artist voices, or exact arrangements.
- Extract only genre-level patterns: rhythm, drums, bass, instruments, arrangement flow, energy curve, mix feel.
- Convert those patterns into generic descriptors that can improve `lib/music-prompt/presets.ts` and `docs/chatgpt-project/01_GENRE_PRESETS.md`.

Source snapshot date: 2026-06-16.

Recommended usage:

1. Review the genre analysis file.
2. Keep only generic, non-song-specific language.
3. If the descriptor improves generation quality, migrate it into `GENRE_PRESETS`.
4. Keep artist/song names out of runtime prompts unless they are sanitized to generic descriptors.

