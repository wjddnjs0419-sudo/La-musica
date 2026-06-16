# RESULT: Prompt box simplification and lyricless vocal handling - 2026-06-16

## Background
- Request: remove the separate Style input because style can already be written in the main prompt.
- Follow-up: lyrics are optional, but vocal generation without user-provided lyrics needed explicit handling so quality does not become ambiguous.
- Constraint: keep the simplified prompt box and existing MiniMax route structure.

## Implementation
- **`components/prompt-box.tsx`**: removed the Style button, Style input, Style icon, related state, reset logic, and `style` payload emission.
- **`lib/music.ts`**: removed `GenerateRequest.style` and removed legacy `Style: ...` prompt composition from `buildMinimaxInput`; MiniMax now receives the compiled prompt directly.
- **`app/api/music/generate/route.ts`**: stopped parsing/persisting `style` and stopped folding it into the translatable user description.
- **`lib/music-prompt/buildMusicPrompt.ts`**: kept lyrics technically optional. When a non-instrumental vocal mode has no lyrics, the final prompt now adds: `if no lyrics are provided, generate original simple singable lyrics that match the user's idea`.
- **`app/api/music/[id]/route.ts`**: thumbnail prompt generation now uses `metadata.genre` instead of removed `metadata.style`.
- **Docs/copy/tests**: updated MiniMax docs, Privacy Policy copy, and compiler tests for lyricless vocal behavior.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler pure logic | `npm test` | Passed; 35 tests / 5 files |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |
| Style removal | `rg` inspection | Passed; no product request/body/UI `style` field remains |
| Lyricless vocal guidance | Unit test | Passed; vocal mode without lyrics keeps `lyrics` undefined and adds original lyric-generation guidance to the prompt |

## Lessons
- A separate Style field duplicates the main prompt and can split the model's strongest signal.
- Lyrics can remain optional, but vocal-without-lyrics needs explicit prompt guidance so the model knows to generate original simple lyrics instead of drifting.
