# RESULT: Music Prompt Compiler - 2026-06-16

## Background
- Request (task.md): users are not prompt engineers — they describe music simply
  ("hard EDM for workout"). The app must internally convert that into a high-quality
  English MiniMax prompt, hidden from normal users.
- Existing flow passed the raw user text almost verbatim to `minimax/music-2.6` on
  Replicate, so quality depended entirely on the user's prompting skill.
- Decisions: expose structured option chips in the UI; store compiler output in the
  existing `musics.metadata` JSONB (no migration); add vitest scoped to the new pure module.

## Implementation
- **`lib/music-prompt/`** (new pure module, vitest-tested):
  - `types.ts` — Genre/Mood/UseCase/VocalMode unions, `BuildMusicPromptInput`,
    `CompiledPrompt`, `PROMPT_COMPILER_VERSION = "v1"`.
  - `presets.ts` — verbatim genre/mood/use-case/vocal preset strings, `REFERENCE_MAP`
    (artist→generic descriptors), `resolveVocalMode`, and validity sets.
  - `sanitizeReferences.ts` — replaces known artist/song references and strips risky
    phrasing ("exactly like", "똑같이", "그대로", …); copyright line added by the compiler.
  - `buildLyricsPayload.ts` — normalizes section tags; returns `undefined` for instrumental.
  - `buildMusicPrompt.ts` — 12-part formula, instrumental/vocal quality boosters, segment
    de-duplication, and a clamp that always keeps the copyright/safety line intact.
  - `index.ts` — `compileMusicPrompt()` entry + re-exports.
- **`lib/music.ts`** — `GenerateRequest` extended with `genre/moods/useCase/vocalMode/language`.
- **`app/api/music/generate/route.ts`** — compiles server-side, sends compiled
  prompt/lyrics/instrumental to Replicate, stores `...compiled.metadata` (raw_user_description,
  final_music_prompt, prompt_version, vocal_mode, …) + `lyrics_payload`. Credit logic unchanged;
  `musics.prompt` stays the raw user text.
- **`components/prompt-box.tsx`** — Genre/Use-case/Vocal selects + Mood multi-select chips
  behind an Options toggle; standalone Instrumental toggle folded into the Vocal select.
- **`docs/MINIMAX_PROMPT_ENGINEERING.md`** — full developer reference.
- Built via subagent-driven TDD: each task implemented by a fresh subagent, then
  spec-compliance + code-quality reviewed; review findings fixed (copyright-line truncation,
  segment dedupe, `/g` regex `.test()` hazard, union-input validation into metadata, mood a11y).

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `lib/music-prompt` pure logic | `npm test` (vitest) | 26 passed (4 files) |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` (Next 16 + typecheck) | Passed |
| Full codebase | `npx tsc --noEmit` | Clean |
| 4 task examples | compiler unit tests | Required substrings present; copyright line always present; length ≤ 2000 |
| Reference sanitize | unit tests | "Bad Bunny"/"임창정" removed, generic descriptors + copyright line emitted |
| Union validation | unit tests | bogus genre/useCase/vocalMode never reach compiled metadata |

## Lessons
- The product brief said MiniMax 2.5; the live integration is `minimax/music-2.6` —
  always inspect the actual model/schema before adding parameters.
- A trailing "always append" clause must be appended **after** length-clamping, or the
  clamp silently drops it.
- Global (`/g`) regexes are stateful across `.test()` calls — safe with `String.replace`
  but a trap for `.test()`; keep validation at the compiler boundary so unvalidated
  strings can't leak into persisted metadata.
