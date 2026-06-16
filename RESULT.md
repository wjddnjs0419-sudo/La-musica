# RESULT: Aggressive genre presets (scene/era/commercial framing) - 2026-06-16

## Background
- Request: stop being conservative — push genre presets to be more "aggressive."
- Clarified intent: push the *reference boundary* (closer to real commercial/scene sound), not just descriptor intensity.
- Safety decision: after flagging platform-ToS, legal, and signal-conflict risks of injecting real artist/song names, the user pivoted to **safe + aggressive** — no artist/song names, scene/era/commercial framing only, copyright safety line kept.

## Implementation
- **`lib/music-prompt/presets.ts` — `GENRE_PRESETS` rewrite (9 genres)**: replaced cautious generic descriptors with scene/era/commercial-anchored language while keeping the same sound-grammar role (no vocal-mode forcing). Examples: EDM → "festival main-stage big-room EDM, chart-ready commercial hook"; Reggaeton → "modern Medellin-style commercial reggaeton, glossy radio-pop sheen, confident late-night perreo energy"; Korean Ballad → "modern Korean drama OST ballad, huge belted final-chorus payoff"; Techno → "peak-time warehouse techno"; Brazilian Funk → "modern baile funk, raw favela party energy". No artist or song names used.
- **`REFERENCE_MAP` expansion**: added four more user-typed-name → generic-descriptor mappings (Karol G, Peso Pluma/corrido, Drake/Travis Scott, Burna Boy/Wizkid/Afrobeats). This is the defensive sanitizer side — it *strips* names users type and substitutes copyright-safe descriptors.
- **`COPYRIGHT_LINE` unchanged**: the always-appended "do not imitate any specific artist, song, melody, or copyrighted track" safety clause is kept intact.
- **Compiler logic untouched**: genre stays "secondary style details" authority; mood cap and vocal-mode resolution unchanged. Scope was genre + reference only.
- **Tests (TDD)**: added RED assertions first — `buildMusicPrompt.test.ts` (festival main-stage, modern Medellin-style commercial reggaeton, Korean drama OST ballad, loud radio-ready electronic mix) and `presets.test.ts` (scene/era commercial framing per genre, a guard that presets never name a banned artist, and Karol G reference-map coverage that does not echo the name back).
- **Docs sync**: `docs/chatgpt-project/01_GENRE_PRESETS.md` genre grammar bullets updated to mirror the new runtime presets.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler + presets | `npm test` | Passed; 38 tests / 5 files |
| Anti-name guard test | `npm test` (presets) | Passed; no genre preset matches a banned artist/song regex |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed (existing workspace-root lockfile warning only) |
| Runtime/doc sync | Inspection of `presets.ts` + `01_GENRE_PRESETS.md` | Passed; ChatGPT Project genre doc mirrors new preset language |

## Lessons
- "Aggressive" was ambiguous; clarifying it as *reference-boundary push* vs *descriptor intensity* changed the whole design — worth resolving before editing.
- Scene/era/commercial framing ("modern Medellin-style commercial reggaeton", "warehouse techno") captures most of a hit's vibe while staying name-free, avoiding the platform-ToS and copyright exposure of literal artist names — and avoids the signal conflict with the always-on copyright safety line.
- Expanding `REFERENCE_MAP` raises vibe fidelity with zero added risk, because it is name-stripping substitution, not name injection.
- A regression-style "presets never name a banned artist" test locks in the safety boundary against future preset edits.
