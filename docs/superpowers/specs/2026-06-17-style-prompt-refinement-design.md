# Style Prompt Refinement (Gemini) — Design

Date: 2026-06-17

## Problem

`compileMusicPrompt` builds the MiniMax prompt by mechanically concatenating
preset descriptors (genre + moods + use-case + vocal + boosters). The result is
a dense, redundant "comma soup" that MiniMax receives verbatim. Manually pasting
the same intent through ChatGPT produces a more *coherent* style prompt and
better music. Goal: automate that refinement in the app.

## Approach (Option A — chosen)

Insert one Gemini call that takes the **already-compiled** template prompt
(presets baked in) and rewrites it into a single coherent MiniMax style prompt.
Presets act as guardrails (musical grammar is guaranteed present); Gemini only
reorganizes and de-duplicates. This is separate from translation — translation
and refinement are two distinct Gemini calls, in this order:

```
prompt → translateToEnglish → compileMusicPrompt → refineStylePrompt → buildMinimaxInput → Replicate
```

Refinement touches ONLY the style/music prompt (`compiled.prompt`). Lyrics
(`compiled.lyrics`) are untouched — they are already handled by the lyrics
assistant.

## Components

### `lib/refineStylePrompt.ts` (new)

Mirrors the `translatePrompt.ts` pattern: free-tier Gemini REST, no SDK, reads
`GEMINI_API_KEY` / `GEMINI_MODEL` (default `gemini-2.5-flash-lite`). Never blocks
generation — any failure returns the original compiled prompt unchanged.

Exports:

- `finalizeRefined(refinedText: string, fallback: string): string` — **pure**.
  Trims; if empty → returns `fallback`. Deterministically guarantees the
  copyright clause is present (re-appends `COPYRIGHT_LINE` if the model dropped
  it — we never trust the LLM for the safety clause). Clamps to 2000 chars with
  the copyright clause intact (same clamp policy as `buildMusicPrompt`).
- `refineStylePrompt(compiledPrompt: string, instrumental: boolean): Promise<string>`
  — calls Gemini with a system instruction to rewrite into a dense,
  descriptor-style (NOT prose) MiniMax prompt, preserving every musical
  descriptor, BPM, key, and vocal/instrumental direction. On success returns
  `finalizeRefined(out, compiledPrompt)`; on unconfigured/non-ok/throw returns
  `compiledPrompt` (which already carries the copyright clause).

`COPYRIGHT_LINE` is exported from `buildMusicPrompt.ts` and reused (single
source of truth) instead of being re-declared.

### `app/api/music/generate/route.ts` (wire-in)

After `compileMusicPrompt`, before `buildMinimaxInput`:

```ts
const refinedPrompt = await refineStylePrompt(compiled.prompt, compiled.instrumental);
```

Pass `refinedPrompt` to `buildMinimaxInput`. Persist both for debugging:
`metadata.compiled_music_prompt = compiled.prompt` (pre-refine) and
`metadata.final_music_prompt = refinedPrompt` (what was actually sent). The
`prompt` DB column (user's raw text, used by `deriveTitle`) is unchanged.

## Error handling

- Unconfigured key / non-2xx / network throw → return original compiled prompt.
  Generation always proceeds.
- LLM drops copyright clause → re-appended deterministically by `finalizeRefined`.
- Over-length output → clamped to 2000 with copyright intact.

## Testing (TDD)

Pure-function tests on `finalizeRefined`:

1. Empty / whitespace refined text → returns fallback unchanged.
2. Refined text missing copyright clause → clause appended.
3. Refined text already containing copyright clause → not duplicated.
4. Over-2000-char refined text → clamped, copyright clause still present & intact.

The network `refineStylePrompt` path is thin glue over `finalizeRefined` and the
shared Gemini REST shape (already exercised by translate in production); not unit
-tested with fetch mocks.

## Cost / rate-limit note

Adds one Gemini free-tier call per generation (now: translate [non-English only]
+ lyrics [on demand] + refine [every generation]). Fallback guarantees a failed
refine never blocks a track. If free-tier limits bite, refinement degrades
gracefully to today's template output.

## Out of scope

- Merging translate + refine into one call (explicitly kept separate).
- Refining lyrics.
- A user toggle for refinement (always-on with fallback).
