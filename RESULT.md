# RESULT: Music prompt compiler quality tuning - 2026-06-16

## Background
- Request: option selections were lowering music quality compared with plain prompt + lyrics. Genre and other options were being understood too literally or too strongly by the model.
- Diagnosis: genre presets were placed before the user prompt and some presets forced vocal/instrumental assumptions (`instrumental`, `male vocal`, `crowd vocals`), causing conflicts with lyrics and the Vocal option.
- Follow-up requirement: genre guidance should not just say labels like "reggaeton beat"; it should describe the concrete beat/rhythm/drums/bass/instrumentation pattern.

## Implementation
- **`lib/music-prompt/buildMusicPrompt.ts`**: made the sanitized user idea the first prompt segment (`prioritize this musical idea`), demoted options into `secondary style details`, `mood shading`, and `arrangement goal`, capped mood guidance to two moods, and guarded invalid runtime option values from leaking `undefined` into prompts.
- **`lib/music-prompt/presets.ts`**: rewrote genre presets as detailed sound grammar: rhythm pattern, kick/snare placement, percussion, bass movement, instrument motifs, energy curve, and mix density. Removed vocal/instrumental forcing from genre presets and reference replacements.
- **`lib/music-prompt/types.ts`**: bumped `PROMPT_COMPILER_VERSION` from `v1` to `v2`.
- **Tests/docs**: updated prompt compiler, preset, and sanitizer tests to assert user-first ordering, concrete beat descriptors, no genre-forced instrumental mode on vocal songs, mood limiting, and v2 docs in `docs/MINIMAX_PROMPT_ENGINEERING.md`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler pure logic | `npm test` | Passed; 34 tests / 5 files |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |
| User-first ordering | Unit test | Passed; compiled prompt starts with the user's idea before option guidance |
| Vocal/genre conflict prevention | Unit test | Passed; vocal reggaeton keeps `female_vocal` and does not inject `Instrumental Latin` / `fully instrumental` from genre guidance |
| Option over-weighting control | Unit test | Passed; mood guidance applies only the first two selected moods |

## Lessons
- For music generation, genre chips should provide concrete audio grammar, not broad genre labels or hidden vocal decisions.
- Options work best as steering hints. The user's prompt and lyrics need to remain the highest-authority signal in the final MiniMax prompt.
