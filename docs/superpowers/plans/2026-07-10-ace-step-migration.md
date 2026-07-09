# MiniMax → ACE-Step Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `minimax/music-2.6` Replicate integration with `fishaudio/ace-step-1.5`, cutting typical generation time from 2–4 minutes to seconds, with no dual-model fallback.

**Architecture:** Keep the existing prompt compiler pipeline (`compileMusicPrompt` → `refineStylePrompt` → Gemini translate) unchanged; only the final Replicate adapter (`buildMinimaxInput` → `buildAceStepInput`), the refined-prompt length target, and the Replicate call site change. New: a `lyrics_required` 400 validation in the generate route, since ACE-Step (unlike MiniMax) cannot improvise its own lyrics for a vocal-mode request with no lyrics.

**Tech Stack:** Next.js 16 App Router route handlers, `replicate` npm SDK, Vitest, TypeScript.

**Reference spec:** `docs/superpowers/specs/2026-07-10-ace-step-migration-design.md` — read it first for the "why", including the live-verified Replicate schema and the version-pinning requirement.

---

### Task 1: `lib/music.ts` — ACE-Step constants and input adapter

**Files:**
- Modify: `lib/music.ts:10-13` (model comment/constant), `lib/music.ts:44-45` (char limits), `lib/music.ts:63-81` (`buildMinimaxInput`)
- Create: `lib/music.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/music.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildAceStepInput, ACE_STEP_DURATION_SECONDS } from "./music";

describe("buildAceStepInput", () => {
  it("sends the trimmed prompt, lyrics, fixed duration, and mp3 format for a vocal track", () => {
    const result = buildAceStepInput({
      prompt: "  upbeat synth pop  ",
      lyrics: "[Verse]\nwalking down the street",
    });
    expect(result).toEqual({
      prompt: "upbeat synth pop",
      lyrics: "[Verse]\nwalking down the street",
      duration: ACE_STEP_DURATION_SECONDS,
      audio_format: "mp3",
    });
  });

  it("sends the literal [Instrumental] lyrics value when instrumental is true", () => {
    const result = buildAceStepInput({
      prompt: "festival big-room edm",
      lyrics: "[Verse]\nthis should be ignored",
      instrumental: true,
    });
    expect(result.lyrics).toBe("[Instrumental]");
  });

  it("sends [Instrumental] when lyrics is missing even if instrumental is false", () => {
    const result = buildAceStepInput({
      prompt: "festival big-room edm",
      instrumental: false,
    });
    expect(result.lyrics).toBe("[Instrumental]");
  });

  it("clamps prompt to 500 chars and lyrics to 3500 chars", () => {
    const result = buildAceStepInput({
      prompt: "a".repeat(600),
      lyrics: `[Verse]\n${"b".repeat(4000)}`,
    });
    expect(result.prompt.length).toBe(500);
    expect(result.lyrics.length).toBe(3500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/music.test.ts`
Expected: FAIL — `buildAceStepInput` is not exported from `./music` (module has no such export yet).

- [ ] **Step 3: Replace the MiniMax constant, char limits, and adapter in `lib/music.ts`**

Replace lines 10-13:

```ts
// Old:
// MiniMax Music 2.6 on Replicate. Official model — referenced by name, no
// pinned version hash. Sings lyrics (vocals + instrumentation); model decides
// length (2-4 min typical, 6 min max), so there is no duration control.
export const MINIMAX_MODEL = "minimax/music-2.6";
```

with:

```ts
// ACE-Step 1.5 (fishaudio/ace-step-1.5) on Replicate. Community model — the
// Replicate API rejects prediction creation by `model` name alone for it
// (verified 2026-07-10: returns 422 "version is required"), so the version
// hash must be pinned and passed as `version`, not `model`, in
// replicate.predictions.create. Diffusion-based: generates a full song with
// vocals in single-digit seconds of GPU compute (predict_time was ~6s for a
// 20s test track), unlike the old MiniMax integration's 2-4 minute
// autoregressive generation. Sings lyrics; duration is an explicit input
// (unlike MiniMax, which decided length itself) — fixed at
// ACE_STEP_DURATION_SECONDS below for parity with the old no-duration-control
// UX. Has no `is_instrumental` boolean: instrumental tracks are signaled by
// sending the literal string "[Instrumental]" as `lyrics` (the field's own
// schema default).
export const ACE_STEP_MODEL = "fishaudio/ace-step-1.5";
export const ACE_STEP_VERSION =
  "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85";
export const ACE_STEP_DURATION_SECONDS = 180;
```

Replace lines 44-45:

```ts
// Old:
// MiniMax input limits.
const MAX_PROMPT_CHARS = 2000;
const MAX_LYRICS_CHARS = 3500;
```

with:

```ts
// ACE-Step input limits. `prompt` is capped at ~500 chars — the model's
// schema documents a ~512-char soft cap and is tuned for short descriptor
// prompts, unlike MiniMax's 2000-char comma soup (the pre-refine compiled
// prompt in buildMusicPrompt.ts is still allowed to run long; refineStylePrompt
// is what compresses it down to this limit before it reaches ACE-Step).
// `lyrics` cap matches ACE-Step's 4096-char field limit (well above what this
// app ever produces).
const MAX_PROMPT_CHARS = 500;
const MAX_LYRICS_CHARS = 3500;
```

Replace lines 63-81 (`buildMinimaxInput`):

```ts
// Old:
// Build the Replicate minimax/music-2.6 input payload. `prompt` carries the
// musical description (genre, BPM, key, vocal type, mood). `lyrics` are actually
// sung — unless `instrumental` is set, in which case lyrics are dropped and a
// vocal-free track is produced.
export function buildMinimaxInput({
  prompt,
  lyrics,
  instrumental = false,
}: {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
}) {
  const composedPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);
  const trimmedLyrics = lyrics?.trim().slice(0, MAX_LYRICS_CHARS);

  return {
    prompt: composedPrompt,
    is_instrumental: instrumental,
    audio_format: "mp3",
    ...(instrumental || !trimmedLyrics ? {} : { lyrics: trimmedLyrics }),
  };
}
```

with:

```ts
// Build the Replicate fishaudio/ace-step-1.5 input payload. `prompt` carries
// the musical description (genre, BPM, key, vocal type, mood). ACE-Step has
// no `is_instrumental` boolean: instrumental tracks are signaled by sending
// the literal string "[Instrumental]" as `lyrics`. Non-instrumental tracks
// always receive real lyrics in production — the caller
// (`app/api/music/generate/route.ts`) rejects vocal-mode requests with no
// lyrics before this function is ever invoked — but this function still
// falls back to "[Instrumental]" defensively if `lyrics` is somehow empty,
// matching the belt-and-suspenders style of the old `buildMinimaxInput`.
export function buildAceStepInput({
  prompt,
  lyrics,
  instrumental = false,
}: {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
}) {
  const composedPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);
  const trimmedLyrics = lyrics?.trim().slice(0, MAX_LYRICS_CHARS);

  return {
    prompt: composedPrompt,
    lyrics: instrumental || !trimmedLyrics ? "[Instrumental]" : trimmedLyrics,
    duration: ACE_STEP_DURATION_SECONDS,
    audio_format: "mp3",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/music.test.ts`
Expected: PASS (4/4)

- [ ] **Step 5: Commit**

```bash
git add lib/music.ts lib/music.test.ts
git commit -m "feat(music): replace MiniMax input adapter with ACE-Step"
```

---

### Task 2: `lib/refineStylePrompt.ts` — shrink the refined-prompt length target

ACE-Step's `prompt` field is ~500 chars max, far shorter than MiniMax's 2000.
`finalizeRefined`'s clamp and the Gemini system instruction both need to
target the new limit.

**Files:**
- Modify: `lib/refineStylePrompt.ts:1-15` (header comment + `MAX_PROMPT_CHARS`), `lib/refineStylePrompt.ts:39-57` (`finalizeRefined` comment + `SYSTEM_INSTRUCTION`)
- Test: `lib/refineStylePrompt.test.ts:33-38`

- [ ] **Step 1: Update the existing test to the new 500-char limit (RED)**

In `lib/refineStylePrompt.test.ts`, replace:

```ts
  it("clamps to 2000 chars with the copyright clause intact", () => {
    const refined = "a".repeat(3000);
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.length).toBeLessThanOrEqual(2000);
    expect(out.endsWith(COPYRIGHT_LINE)).toBe(true);
  });
```

with:

```ts
  it("clamps to 500 chars with the copyright clause intact", () => {
    const refined = "a".repeat(3000);
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith(COPYRIGHT_LINE)).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/refineStylePrompt.test.ts`
Expected: FAIL on the renamed test — `out.length` is still clamped to 2000 by the current code, so `toBeLessThanOrEqual(500)` fails for a 2000-char output.

- [ ] **Step 3: Update `lib/refineStylePrompt.ts`**

Replace lines 1-15 (header comment + constant):

```ts
// Old:
// Refine the compiled MiniMax style prompt with one Gemini pass. The deterministic
// `compileMusicPrompt` concatenates preset descriptors into a dense, redundant
// "comma soup"; this rewrites it into a single coherent, descriptor-style prompt
// while keeping every musical descriptor the presets guaranteed. Mirrors the
// free-tier Gemini REST pattern in `translatePrompt.ts` (no SDK; GEMINI_API_KEY /
// GEMINI_MODEL). Separate Gemini call from translation. Never blocks generation:
// any failure returns the original compiled prompt unchanged.

import { COPYRIGHT_LINE } from "./music-prompt/buildMusicPrompt";
import { fetchGeminiWithRetry } from "./geminiFetch";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// MiniMax prompt hard limit (matches buildMusicPrompt / buildMinimaxInput).
const MAX_PROMPT_CHARS = 2000;
```

with:

```ts
// Refine the compiled style prompt with one Gemini pass. The deterministic
// `compileMusicPrompt` concatenates preset descriptors into a dense, redundant
// "comma soup" (allowed to run up to buildMusicPrompt's own 2000-char limit);
// this rewrites it into a single coherent, descriptor-style prompt short
// enough for ACE-Step's ~500-char `prompt` field, while keeping every musical
// descriptor the presets guaranteed. Mirrors the free-tier Gemini REST pattern
// in `translatePrompt.ts` (no SDK; GEMINI_API_KEY / GEMINI_MODEL). Separate
// Gemini call from translation. Never blocks generation: any failure returns
// the original compiled prompt unchanged (which is then hard-clamped to
// ACE_STEP's limit downstream in `buildAceStepInput`, so an over-long fallback
// still can't reach Replicate uncapped).

import { COPYRIGHT_LINE } from "./music-prompt/buildMusicPrompt";
import { fetchGeminiWithRetry } from "./geminiFetch";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// ACE-Step prompt hard limit — shorter than buildMusicPrompt.ts's own
// 2000-char pre-refine clamp on purpose: this is the limit on what actually
// reaches ACE-Step (via buildAceStepInput in lib/music.ts), not on the
// intermediate comma-soup this function receives as input.
const MAX_PROMPT_CHARS = 500;
```

Replace lines 39-57 (`finalizeRefined` comment + `SYSTEM_INSTRUCTION`):

```ts
// Old:
// Deterministically guarantee the safety/copyright clause and the length limit.
// We never trust the LLM for the copyright clause: strip whatever it emitted
// (verbatim or paraphrased) and re-append exactly one canon clause, then clamp
// the body so the clause is never truncated (same policy as buildMusicPrompt).
// Empty refined output — or output that is nothing but copyright text — falls
// back to the original prompt.
export function finalizeRefined(refinedText: string, fallback: string): string {
  const trimmed = refinedText.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;

  const stripped = stripCopyrightClauses(trimmed);
  if (!stripped) return fallback;

  const body = stripped.slice(0, MAX_PROMPT_CHARS - COPYRIGHT_LINE.length - 2);
  return `${body}, ${COPYRIGHT_LINE}`.replace(/\s+/g, " ").trim();
}

const SYSTEM_INSTRUCTION =
  "You are a prompt engineer for the MiniMax music generation model. You receive a machine-assembled style prompt whose descriptors come from genre/mood/use-case presets and may be redundant or disorganized. Rewrite it into ONE coherent, dense, comma-separated descriptor prompt (NOT prose, NOT sentences). Preserve every musical descriptor, BPM, key, and vocal/instrumental direction. Do NOT include any copyright, 'original composition', or 'do not imitate' clause — that is appended automatically afterward, so omit it entirely. Remove duplicate or contradictory descriptors and order them naturally (overall style first, then rhythm, instrumentation, mix, vocals). Do not add new genres or instruments that were not implied. Output ONLY the rewritten prompt, no labels or commentary.";
```

with:

```ts
// Deterministically guarantee the safety/copyright clause and the length limit.
// We never trust the LLM for the copyright clause: strip whatever it emitted
// (verbatim or paraphrased) and re-append exactly one canon clause, then clamp
// the body so the clause is never truncated (same clamping mechanism as
// buildMusicPrompt's own compiler clamp, just a shorter limit tuned for
// ACE-Step's `prompt` field instead of MiniMax's). Empty refined output — or
// output that is nothing but copyright text — falls back to the original
// prompt.
export function finalizeRefined(refinedText: string, fallback: string): string {
  const trimmed = refinedText.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;

  const stripped = stripCopyrightClauses(trimmed);
  if (!stripped) return fallback;

  const body = stripped.slice(0, MAX_PROMPT_CHARS - COPYRIGHT_LINE.length - 2);
  return `${body}, ${COPYRIGHT_LINE}`.replace(/\s+/g, " ").trim();
}

const SYSTEM_INSTRUCTION =
  "You are a prompt engineer for the ACE-Step music generation model. You receive a machine-assembled style prompt whose descriptors come from genre/mood/use-case presets and may be redundant or disorganized. Rewrite it into ONE coherent, dense, comma-separated descriptor prompt (NOT prose, NOT sentences), no more than 400 characters — the copyright clause is appended automatically afterward and needs the remaining room, so a longer output will be truncated. Preserve the most important musical descriptors, BPM, key, and vocal/instrumental direction, dropping lower-priority descriptors first if you must cut for length. Do NOT include any copyright, 'original composition', or 'do not imitate' clause — that is appended automatically afterward, so omit it entirely. Remove duplicate or contradictory descriptors and order them naturally (overall style first, then rhythm, instrumentation, mix, vocals). Do not add new genres or instruments that were not implied. Output ONLY the rewritten prompt, no labels or commentary.";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/refineStylePrompt.test.ts`
Expected: PASS (all tests in this file)

- [ ] **Step 5: Commit**

```bash
git add lib/refineStylePrompt.ts lib/refineStylePrompt.test.ts
git commit -m "feat(music): shrink refined prompt target to ACE-Step's 500-char limit"
```

---

### Task 3: `lib/music-prompt/buildMusicPrompt.ts` — remove dead lyricless-vocal guidance

MiniMax could improvise its own sung lyrics when a vocal mode was selected
with no lyrics provided. ACE-Step cannot (confirmed in the spike — empty
`lyrics` defaults to `"[Instrumental]"`). Task 4 makes the generate route
reject that case with `lyrics_required` before compiling, so this branch
becomes unreachable in production. Remove it here rather than leaving dead
code behind.

**Files:**
- Modify: `lib/music-prompt/buildMusicPrompt.ts:27-28` (const), `lib/music-prompt/buildMusicPrompt.ts:87-89` (call site), `lib/music-prompt/buildMusicPrompt.ts:48` (comment)
- Test: `lib/music-prompt/buildMusicPrompt.test.ts:84-93`

- [ ] **Step 1: Delete the test for the removed behavior**

In `lib/music-prompt/buildMusicPrompt.test.ts`, delete this test (it exercises a branch this task removes):

```ts
  it("keeps lyrics optional but guides lyricless vocal songs", () => {
    const r = compileMusicPrompt({
      userDescription: "upbeat birthday song for Mina",
      vocalMode: "female_vocal",
    });
    expect(r.instrumental).toBe(false);
    expect(r.lyrics).toBeUndefined();
    expect(r.prompt).toContain("expressive female vocal");
    expect(r.prompt).toContain("generate original simple singable lyrics");
  });
```

Replace it with a regression test asserting the guidance text is gone (this is the RED step — it fails against the current code, which still emits the string):

```ts
  it("no longer injects lyricless-vocal guidance (ACE-Step requires lyrics upstream)", () => {
    const r = compileMusicPrompt({
      userDescription: "upbeat birthday song for Mina",
      vocalMode: "female_vocal",
    });
    expect(r.instrumental).toBe(false);
    expect(r.lyrics).toBeUndefined();
    expect(r.prompt).toContain("expressive female vocal");
    expect(r.prompt).not.toContain("generate original simple singable lyrics");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/music-prompt/buildMusicPrompt.test.ts`
Expected: FAIL — current code still pushes `LYRICLESS_VOCAL_GUIDANCE`, so `not.toContain(...)` fails.

- [ ] **Step 3: Remove the dead branch in `lib/music-prompt/buildMusicPrompt.ts`**

Delete this constant (around line 27-28):

```ts
const LYRICLESS_VOCAL_GUIDANCE =
  "if no lyrics are provided, generate original simple singable lyrics that match the user's idea";
```

Delete this call site (around line 87-89):

```ts
  if (!instrumental && !input.lyrics?.trim()) {
    parts.push(LYRICLESS_VOCAL_GUIDANCE);
  }
```

Update the header comment on line 48 — replace:

```ts
// MiniMax prompt. The user's own concept leads; options add lower-authority
```

with:

```ts
// ACE-Step prompt. The user's own concept leads; options add lower-authority
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/music-prompt/buildMusicPrompt.test.ts`
Expected: PASS (all tests in this file)

- [ ] **Step 5: Commit**

```bash
git add lib/music-prompt/buildMusicPrompt.ts lib/music-prompt/buildMusicPrompt.test.ts
git commit -m "refactor(music): remove lyricless-vocal guidance now that lyrics are required upstream"
```

---

### Task 4: `app/api/music/generate/route.ts` — wire in ACE-Step and the lyrics-required check

**Files:**
- Modify: `app/api/music/generate/route.ts:10-16` (imports), `app/api/music/generate/route.ts:108-125` (compile + new validation), `app/api/music/generate/route.ts:146-155` (`p_model`), `app/api/music/generate/route.ts:186-196` (Replicate call)

This task has no isolated unit test — it's route wiring over already-tested
pure functions (Task 1-3) and the Replicate SDK. It's verified by Task 7's
build/lint gate and a manual smoke test against the real API (Step 5 below),
consistent with how the original MiniMax wiring in this file was never
unit-tested either (see `git log -- app/api/music/generate/route.ts`).

- [ ] **Step 1: Update imports**

Replace:

```ts
import {
  MINIMAX_MODEL,
  buildMinimaxInput,
  type Music,
} from "@/lib/music";
```

with:

```ts
import {
  ACE_STEP_MODEL,
  ACE_STEP_VERSION,
  buildAceStepInput,
  type Music,
} from "@/lib/music";
```

- [ ] **Step 2: Add the lyrics-required validation right after `compileMusicPrompt`**

Find:

```ts
  const compiled = compileMusicPrompt({
    userDescription,
    genre,
    moods,
    useCase,
    vocalMode: vocalMode ?? (instrumental ? "instrumental" : undefined),
    language,
    lyrics: lyrics || undefined,
  });

  // Refine the compiled "comma soup" into a coherent MiniMax style prompt via a
  // separate Gemini pass (presets stay as guardrails). Falls back to the
  // compiled prompt on any failure, so this never blocks generation.
  const refinedPrompt = await refineStylePrompt(
    compiled.prompt,
    compiled.instrumental,
  );
```

Replace with:

```ts
  const compiled = compileMusicPrompt({
    userDescription,
    genre,
    moods,
    useCase,
    vocalMode: vocalMode ?? (instrumental ? "instrumental" : undefined),
    language,
    lyrics: lyrics || undefined,
  });

  // ACE-Step has no server-side lyric improvisation (unlike MiniMax): a vocal
  // mode with no lyrics would silently render as an instrumental track
  // (empty `lyrics` defaults to "[Instrumental]" — see buildAceStepInput).
  // Reject before spending a refine call, a DB round-trip, or a credit.
  // `compiled.instrumental` is the fully-resolved flag (covers explicit
  // `vocalMode`, the legacy `instrumental` boolean, and genre-based
  // auto-resolution in `resolveVocalMode`), so this check can't miss a case
  // the compiler itself would have treated as vocal.
  if (!compiled.instrumental && !lyrics) {
    return jsonWithAuthCookies(
      { error: "lyrics_required" },
      { status: 400 },
      refreshedTokens,
    );
  }

  // Refine the compiled "comma soup" into a coherent ACE-Step style prompt via
  // a separate Gemini pass (presets stay as guardrails). Falls back to the
  // compiled prompt on any failure, so this never blocks generation.
  const refinedPrompt = await refineStylePrompt(
    compiled.prompt,
    compiled.instrumental,
  );
```

- [ ] **Step 3: Update the DB model label**

Find (inside the `create_music_with_credit` RPC call):

```ts
  const { data: reserved, error: reserveError } = await admin.database.rpc(
    "create_music_with_credit",
    {
      p_user_id: user.id,
      p_prompt: prompt,
      p_title: fallbackTitle,
      p_model: MINIMAX_MODEL,
      p_metadata: initialMetadata,
    },
  );
```

Replace `p_model: MINIMAX_MODEL,` with `p_model: ACE_STEP_MODEL,` (everything else in this block is unchanged).

- [ ] **Step 4: Swap the Replicate call**

Find:

```ts
  let predictionId: string;
  try {
    const prediction = await replicate.predictions.create({
      model: MINIMAX_MODEL,
      input: buildMinimaxInput({
        prompt: refinedPrompt,
        lyrics: compiled.lyrics,
        instrumental: compiled.instrumental,
      }),
    });
    predictionId = prediction.id;
```

Replace with:

```ts
  let predictionId: string;
  try {
    const prediction = await replicate.predictions.create({
      version: ACE_STEP_VERSION,
      input: buildAceStepInput({
        prompt: refinedPrompt,
        lyrics: compiled.lyrics,
        instrumental: compiled.instrumental,
      }),
    });
    predictionId = prediction.id;
```

(The `catch` block below it, which refunds credit and returns
`generation_failed`, is unchanged.)

- [ ] **Step 5: Manual smoke test against the real API**

Run: `npm run dev`, sign in, and generate one vocal track with real lyrics
from the workspace UI. Confirm in the browser network tab / server logs that:
- The `POST /api/music/generate` response is 200 with a `processing` row.
- Polling `GET /api/music/[id]` transitions to `completed` within roughly
  10-30 seconds (not minutes) once Replicate's queue starts processing.
- The finished track plays back audio (not silence/instrumental) when lyrics
  were provided.

Then generate one instrumental track and confirm it has no vocals, and
attempt one vocal-mode generation with the lyrics box left empty and confirm
the UI shows an error instead of silently producing an instrumental track
(full error-message wiring is Task 5 — at this point it's fine if the raw
`lyrics_required` string is what's displayed).

- [ ] **Step 6: Commit**

```bash
git add app/api/music/generate/route.ts
git commit -m "feat(music): wire generate route to ACE-Step, require lyrics for vocal tracks"
```

---

### Task 5: `components/music-workspace.tsx` — friendly error for `lyrics_required`

**Files:**
- Modify: `components/music-workspace.tsx:25` (message constants), `components/music-workspace.tsx:339-344` (`handleSend` error branch)

- [ ] **Step 1: Add the message constant**

Find:

```ts
const INSUFFICIENT_CREDIT_MESSAGE = "Not enough credits. Please upgrade.";
```

Replace with:

```ts
const INSUFFICIENT_CREDIT_MESSAGE = "Not enough credits. Please upgrade.";
const LYRICS_REQUIRED_MESSAGE =
  "Add lyrics for vocal tracks, or switch to Instrumental.";
```

- [ ] **Step 2: Handle the new error code in `handleSend`**

Find:

```ts
          if (reason === "insufficient_credit") {
            setError(INSUFFICIENT_CREDIT_MESSAGE);
            onOpenCreditModal?.();
            return;
          }
          setError(reason);
          return;
```

Replace with:

```ts
          if (reason === "insufficient_credit") {
            setError(INSUFFICIENT_CREDIT_MESSAGE);
            onOpenCreditModal?.();
            return;
          }
          if (reason === "lyrics_required") {
            setError(LYRICS_REQUIRED_MESSAGE);
            return;
          }
          setError(reason);
          return;
```

- [ ] **Step 3: Manual check**

In the running dev server, select a vocal mode, leave lyrics empty, and
submit. Confirm the composer shows "Add lyrics for vocal tracks, or switch to
Instrumental." instead of the raw `lyrics_required` string.

- [ ] **Step 4: Commit**

```bash
git add components/music-workspace.tsx
git commit -m "feat(music): show a friendly message when lyrics are required"
```

---

### Task 6: Update docs and remaining code comments

Mechanical text fixes — no code behavior changes. Two groups: (A) simple
`MiniMax` → `ACE-Step` / `minimax/music-2.6` → `fishaudio/ace-step-1.5`
renames, and (B) `is_instrumental`-specific sentences that need semantic
rewrites since that field no longer exists.

**Files:**
- Rename: `docs/MINIMAX_PROMPT_ENGINEERING.md` → `docs/ACE_STEP_PROMPT_ENGINEERING.md`
- Modify: `docs/ACE_STEP_PROMPT_ENGINEERING.md`, `docs/chatgpt-project/00_OVERVIEW.md`, `docs/chatgpt-project/02_LYRIC_STRUCTURES.md`, `docs/chatgpt-project/03_PROMPT_COMPILER_RULES.md`, `docs/chatgpt-project/04_PRODUCT_DECISIONS.md`, `lib/translatePrompt.ts:3`, `lib/music-prompt/buildLyricsPayload.ts:20,32`

- [ ] **Step 1: Rename the main doc**

```bash
git mv docs/MINIMAX_PROMPT_ENGINEERING.md docs/ACE_STEP_PROMPT_ENGINEERING.md
```

- [ ] **Step 2: Fix `docs/ACE_STEP_PROMPT_ENGINEERING.md` title and intro**

Replace:

```md
# MiniMax Prompt Engineering — The Music Prompt Compiler
```

with:

```md
# ACE-Step Prompt Engineering — The Music Prompt Compiler
```

Replace:

```md
the MiniMax music model on Replicate.
```

with:

```md
the ACE-Step music model on Replicate.
```

Replace:

```md
A good MiniMax prompt is a long, comma-separated wall of English production
```

with:

```md
A good ACE-Step prompt is a comma-separated wall of English production
```

- [ ] **Step 3: Rewrite the "## 3." model-specific section in `docs/ACE_STEP_PROMPT_ENGINEERING.md`**

Replace this whole block:

```md
## 3. MiniMax prompt guidelines

The integration uses **`minimax/music-2.6`** on Replicate (`MINIMAX_MODEL` in
`lib/music.ts`).

> **Version note:** the product brief referred to MiniMax 2.5. The shipped
> integration targets `minimax/music-2.6` (the current official Replicate model).
> This doc documents the real model id; if you read "2.5" in older planning
> notes, the code is the authority.

The Replicate input is assembled by `buildMinimaxInput` in `lib/music.ts`:

- **`prompt`** — the musical description. It should cover style, mood, genre,
  scenario/use-case, instrumentation, tempo, vocal type, arrangement, and
  production quality. The compiler's output is exactly this kind of string.
  The whole thing is clamped to `MAX_PROMPT_CHARS = 2000`.
- **`lyrics`** — optional words that are actually **sung**. Sent only for vocal
  tracks when the user provides lyrics. Clamped to `MAX_LYRICS_CHARS = 3500`.
  If a vocal mode is selected without lyrics, the compiler keeps `lyrics`
  omitted and adds prompt guidance telling the model it may generate original
  simple singable lyrics matching the user's idea.
- **`is_instrumental`** — when `true`, lyrics are **dropped**: `buildMinimaxInput`
  omits the `lyrics` field entirely (`instrumental || !trimmedLyrics ? {} :
  { lyrics }`). A vocal-free track is produced.
- **`audio_format`** — always `"mp3"`.

The model decides length (2-4 min typical, ~6 min max); there is no duration
control.
```

with:

```md
## 3. ACE-Step prompt guidelines

The integration uses **`fishaudio/ace-step-1.5`** on Replicate
(`ACE_STEP_MODEL` in `lib/music.ts`), pinned to a specific `version` hash
(`ACE_STEP_VERSION`) — it's a community model, and Replicate rejects
prediction creation by model name alone for it.

The Replicate input is assembled by `buildAceStepInput` in `lib/music.ts`:

- **`prompt`** — the musical description. It should cover style, mood, genre,
  scenario/use-case, instrumentation, tempo, vocal type, arrangement, and
  production quality. The compiler's raw output can run up to 2000 chars, but
  `refineStylePrompt` compresses it down to ACE-Step's much shorter
  `MAX_PROMPT_CHARS = 500` before it's sent — this model is tuned for short
  descriptor prompts, unlike MiniMax's dense comma soup.
- **`lyrics`** — words that are actually **sung**. Clamped to
  `MAX_LYRICS_CHARS = 3500` (ACE-Step's own field limit is 4096). Unlike
  MiniMax, ACE-Step cannot improvise its own lyrics: a vocal mode selected
  without lyrics is rejected upstream with a `lyrics_required` 400 in
  `app/api/music/generate/route.ts`, before the compiler or Replicate are ever
  invoked.
- **Instrumental tracks** — ACE-Step has no `is_instrumental` boolean.
  Instrumental is signaled by sending the literal string `"[Instrumental]"` as
  `lyrics` (this is also the field's own schema default).
- **`duration`** — an explicit input, unlike MiniMax which decided length
  itself. Fixed at `ACE_STEP_DURATION_SECONDS = 180` for parity with the old
  no-duration-control UX.
- **`audio_format`** — always `"mp3"`.
```

- [ ] **Step 4: Apply the simple renames (group A)**

Run this from the repo root — it only touches the 5 straightforward
`MiniMax`→`ACE-Step` / `minimax/music-2.6`→`fishaudio/ace-step-1.5` lines that
Step 2/3 above didn't already rewrite by hand (the ones with no
`is_instrumental` semantics attached):

```bash
sed -i '' \
  -e 's/minimax\/music-2\.6/fishaudio\/ace-step-1.5/g' \
  -e 's/MiniMax/ACE-Step/g' \
  docs/chatgpt-project/00_OVERVIEW.md \
  docs/chatgpt-project/04_PRODUCT_DECISIONS.md
```

This covers:
- `docs/chatgpt-project/00_OVERVIEW.md:8` — model name.
- `docs/chatgpt-project/04_PRODUCT_DECISIONS.md:11,20,83,89` — "MiniMax prompt
  engineering", "MiniMax input assembly", model name, "compiles a MiniMax
  prompt".

- [ ] **Step 5: Fix the `is_instrumental`-specific sentences (group B)**

These need semantic rewrites, not just a name swap. In
`docs/chatgpt-project/02_LYRIC_STRUCTURES.md`:

Replace:

```md
Important: La Musica does not currently maintain separate hardcoded lyric templates such as "viral song structure" or "Korean ballad structure" in the app. The current project supports a lightweight lyrics payload system: optional lyrics, normalized section tags, vocal-mode branching, and MiniMax-compatible payload limits.
```

with:

```md
Important: La Musica does not currently maintain separate hardcoded lyric templates such as "viral song structure" or "Korean ballad structure" in the app. The current project supports a lightweight lyrics payload system: required lyrics for vocal tracks, normalized section tags, vocal-mode branching, and ACE-Step-compatible payload limits.
```

Replace:

```md
- The app sends those words as the MiniMax `lyrics` field for vocal tracks.
```

with:

```md
- The app sends those words as the ACE-Step `lyrics` field for vocal tracks.
```

Replace:

```md
- MiniMax receives `is_instrumental: true`.
```

(the one under "For instrumental:") with:

```md
- ACE-Step receives the literal string `"[Instrumental]"` as `lyrics`.
```

Replace:

```md
- MiniMax receives `is_instrumental: false`.
```

with:

```md
- ACE-Step receives the user's real lyrics as `lyrics` (never empty — the
  route rejects vocal-mode requests with no lyrics before this point).
```

Replace:

```md
- If no lyrics are provided, no lyrics field is sent, but the prompt asks MiniMax to generate original simple singable lyrics.
```

with:

```md
- If no lyrics are provided for a vocal mode, `POST /api/music/generate`
  rejects the request with `lyrics_required` (400) instead of generating.
```

Replace:

```md
When ChatGPT creates lyrics for this project, prefer compact section-tagged lyrics that fit MiniMax's `lyrics` field.
```

with:

```md
When ChatGPT creates lyrics for this project, prefer compact section-tagged lyrics that fit ACE-Step's `lyrics` field.
```

In `docs/chatgpt-project/03_PROMPT_COMPILER_RULES.md`:

Replace:

```md
Users write a simple idea and optional lyrics/options. The service internally compiles that into a high-density English MiniMax prompt.
```

with:

```md
Users write a simple idea and optional lyrics/options. The service internally compiles that into a high-density English style prompt, then compresses it for ACE-Step.
```

Replace:

```md
- Server compiles the final MiniMax prompt.
```

with:

```md
- Server compiles the final ACE-Step prompt.
```

Replace:

```md
- MiniMax receives `is_instrumental: true`.
```

(the one under "## Instrumental Behavior") with:

```md
- ACE-Step receives the literal string `"[Instrumental]"` as `lyrics`.
```

Replace this whole block:

```md
## MiniMax Input

Model:

- `minimax/music-2.6`

Input sent to Replicate:

- `prompt`: compiled prompt, max 2000 chars
- `is_instrumental`: resolved instrumental boolean
- `audio_format`: `mp3`
- `lyrics`: included only for non-instrumental tracks with user-provided lyrics

Duration:

- No app-level duration control.
```

with:

```md
## ACE-Step Input

Model:

- `fishaudio/ace-step-1.5`, pinned to a specific `version` hash

Input sent to Replicate:

- `prompt`: refined prompt, max 500 chars
- `lyrics`: user's lyrics for vocal tracks (required — the route rejects
  vocal-mode requests with empty lyrics), or the literal `"[Instrumental]"`
  for instrumental tracks
- `duration`: fixed at 180 seconds
- `audio_format`: `mp3`

Duration:

- Fixed at 180 seconds server-side; no user-facing duration control.
```

- [ ] **Step 6: Fix code comments in `lib/translatePrompt.ts` and `lib/music-prompt/buildLyricsPayload.ts`**

In `lib/translatePrompt.ts`, replace:

```ts
// English MiniMax prompt quality. Uses Google's free-tier Gemini API directly
```

with:

```ts
// English style-prompt quality. Uses Google's free-tier Gemini API directly
```

In `lib/music-prompt/buildLyricsPayload.ts`, replace:

```ts
// Distinct canonical section-tag spellings MiniMax receives. The lyrics
```

with:

```ts
// Distinct canonical section-tag spellings the music model receives. The lyrics
```

and replace:

```ts
// Build the lyrics field sent to MiniMax. Instrumental songs carry no sung
// words (the integration drops lyrics when is_instrumental is true). For vocal
// songs, preserve the user's words and normalize section tags; wrap
// unstructured input in a single [Verse] tag.
```

with:

```ts
// Build the lyrics field sent to the music model. Instrumental songs carry no
// sung words (compileMusicPrompt returns `lyrics: undefined` for instrumental
// mode; buildAceStepInput turns that into the literal "[Instrumental]" value
// downstream). For vocal songs, preserve the user's words and normalize
// section tags; wrap unstructured input in a single [Verse] tag.
```

- [ ] **Step 7: Commit**

```bash
git add docs/ lib/translatePrompt.ts lib/music-prompt/buildLyricsPayload.ts
git commit -m "docs: replace MiniMax references with ACE-Step across docs and comments"
```

---

### Task 7: Final validation

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the updated/new tests from Tasks 1-3.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: succeeds with no type errors (in particular, no remaining
references anywhere in the tree to `MINIMAX_MODEL` or `buildMinimaxInput`,
which no longer exist).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Grep for stragglers**

Run: `grep -rn "MINIMAX_MODEL\|buildMinimaxInput\|minimax/music" --include="*.ts" --include="*.tsx" app lib components`
Expected: no matches. (Comment-only mentions of "MiniMax" as a historical
reference in `RESULT_ARCHIVE.md` / `task.md` are fine to leave — those are
dated historical logs, not live docs, and are out of scope per the design
spec.)

- [ ] **Step 5: Update `PLAN.md`**

Move the in-progress entry for this work from `## In Progress` to `## Done` as
a one-line `[Done]` summary (per this repo's `CLAUDE.md` workflow), and write
`RESULT.md` per the existing format (background/구현/Verification
Matrix/교훈), archiving the previous `RESULT.md` entry to the top of
`RESULT_ARCHIVE.md` first.

- [ ] **Step 6: Final commit**

```bash
git add PLAN.md RESULT.md RESULT_ARCHIVE.md
git commit -m "docs: record ACE-Step migration completion"
```
