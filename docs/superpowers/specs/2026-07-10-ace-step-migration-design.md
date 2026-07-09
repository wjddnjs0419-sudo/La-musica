# MiniMax → ACE-Step Migration — Design

Date: 2026-07-10

## Problem

`minimax/music-2.6` on Replicate is an autoregressive model: full-track
generation typically takes 2–4 minutes (up to 6 minutes), which dominates the
"why is generation so slow" complaint. `ACE-Step` is a diffusion-based music
model available on Replicate that generates a full song with vocals in
roughly 20 seconds (A100) / well under Replicate's reported ~90s prediction
time, while still accepting a dense comma-separated style prompt and
section-tagged lyrics — a close match for what this codebase already produces.
Decision: **fully replace** MiniMax with ACE-Step. No dual-model fallback, no
feature flag — MiniMax code, docs, and env references are removed.

## Approach (chosen)

Keep the existing compiler pipeline (`compileMusicPrompt` → `refineStylePrompt`
→ Gemini translate) unchanged in spirit — it already produces a comma-soup
style prompt and `[Verse]/[Chorus]/[Bridge]`-tagged lyrics, which map onto
ACE-Step's `prompt` + `lyrics` inputs. Only the final adapter
(`buildMinimaxInput` → `buildAceStepInput`), the refinement output length
target, and the Replicate call site change.

```
prompt → translateToEnglish → compileMusicPrompt → refineStylePrompt → buildAceStepInput → Replicate (ACE-Step)
```

**Model**: `fishaudio/ace-step-1.5` (newer, higher SongEval/Lyric-Alignment
benchmarks than `lucataco/ace-step`, ~$0.087/run), pinned to version
`74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85`
(confirmed required — see spike below).

**Duration**: fixed default, no new UI. A constant (`ACE_STEP_DURATION_SECONDS`,
proposed `180`) is sent on every request — matches today's "no duration
control" UX. Revisit exposing a duration slider later if desired (tracked in
`## Future / Later`, not this change).

## Verification spike (completed 2026-07-10)

Ran one live prediction against `fishaudio/ace-step-1.5` (20s test track) and
inspected the model's OpenAPI input schema directly via the Replicate API.
Confirmed facts, replacing all speculative items from the original spike plan:

1. **Input fields**: `prompt` (string, soft cap ~512 chars per schema
   description — NOT enforced server-side as a hard `maxLength`, but the model
   is tuned for short prompts, unlike MiniMax's 2000-char comma soup),
   `lyrics` (string, max 4096 chars, **default `"[Instrumental]"`**), `duration`
   (number, -1 = auto or 30–600 range), `audio_format` (enum, default `"mp3"`).
   No `tags` field — the design doc's original assumption was wrong; `prompt`
   is the correct name, still comma-separated-descriptor style per ACE-Step's
   own docs.
2. **Version pinning is required.** `fishaudio/ace-step-1.5` is a community
   model: `POST /v1/predictions` with `model: "fishaudio/ace-step-1.5"`
   returns `422 version is required`, and the official-model-style endpoint
   `POST /v1/models/fishaudio/ace-step-1.5/predictions` returns `404`. Only
   `replicate.predictions.create({ version: ACE_STEP_VERSION, input })` with
   the version hash works. Pinned version:
   `74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85`.
3. **Instrumental handling**: leaving `lyrics` empty/omitted defaults to
   `"[Instrumental]"` (no vocals) — confirmed by the schema default, and
   ACE-Step does not auto-write its own lyrics the way MiniMax could. This
   surfaced a real product gap (see "Lyricless vocal mode" below).
4. **Output shape**: `output` is an array with one mp3 URL string — identical
   shape to MiniMax. Verified by downloading the result and confirming
   `audio_format: "mp3"` produces a real, correctly-durationed mp3 (requested
   20s → actual 20.04s per `afinfo`). **No changes needed to
   `app/api/music/[id]/route.ts`'s audio persistence logic.**
5. **Speed**: `predict_time` was 6.1s for a 20s track (well under MiniMax's
   2–4 minutes). `total_time` was 103s including cold-start/queue overhead for
   this one-off call; steady-state should be faster. Full 180s tracks were not
   separately benchmarked (cost/time tradeoff) — expected to scale
   sub-linearly per ACE-Step's published benchmarks (diffusion step count is
   independent of target duration), but this is an assumption carried into
   implementation, not a re-verified fact.

### Lyricless vocal mode (new product decision)

MiniMax could generate original sung lyrics on its own when a vocal mode was
selected but the user left lyrics blank (`LYRICLESS_VOCAL_GUIDANCE` in
`buildMusicPrompt.ts`). ACE-Step cannot — omitted/empty lyrics silently
produces an instrumental track regardless of the requested vocal mode, which
would be a silent product regression.

**Decision: require lyrics input.** `POST /api/music/generate` now rejects
with 400 when a non-instrumental vocal mode is selected and `lyrics` is blank,
instead of silently falling back to instrumental or fabricating lyrics
server-side. `LYRICLESS_VOCAL_GUIDANCE` and its call site in
`buildMusicPrompt.ts` are removed as dead code (no longer a reachable state
once the route validates upstream). The existing AI Lyrics Assistant
(`/api/lyrics/chat`) is the user's path to getting lyrics before generating.

## Components

### `lib/music.ts`

- Replace `MINIMAX_MODEL` with `ACE_STEP_MODEL = "fishaudio/ace-step-1.5"` and
  a new `ACE_STEP_VERSION = "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85"`.
  `ACE_STEP_MODEL` is stored in the DB `model` column (readable label, same
  role `MINIMAX_MODEL` played); `ACE_STEP_VERSION` is what's actually passed
  to `replicate.predictions.create`.
- Replace `buildMinimaxInput` with `buildAceStepInput({ prompt, lyrics,
  instrumental })` returning `{ prompt, lyrics, duration, audio_format }`.
  `lyrics` is `"[Instrumental]"` when `instrumental` is true, otherwise the
  (now-guaranteed-non-empty, see below) trimmed lyrics. `duration` is the new
  `ACE_STEP_DURATION_SECONDS = 180` constant. Pure function, TDD unit tests.
- `MAX_PROMPT_CHARS` lowered from `2000` to `500` (ACE-Step's `prompt` field
  is tuned for short input; the old 2000-char comma soup is out of the
  model's intended range even though not hard-rejected). `MAX_LYRICS_CHARS`
  stays `3500` (still under ACE-Step's 4096 cap).
- Doc comment above the model constant rewritten for ACE-Step (diffusion
  model, ~180s fixed duration, no `is_instrumental` boolean — instrumental is
  signaled via the literal `"[Instrumental]"` lyrics value).

### `lib/refineStylePrompt.ts`

- Its own local `MAX_PROMPT_CHARS` (currently `2000`, used by `finalizeRefined`
  to clamp the Gemini-rewritten prompt before the copyright clause is
  appended) drops to `500` to match ACE-Step's limit.
- `SYSTEM_INSTRUCTION` gains an explicit length target ("Keep the total output
  under 400 characters before the copyright clause is added") so Gemini
  doesn't produce prose that gets hard-truncated mid-phrase by the code-level
  clamp.

### `app/api/music/generate/route.ts`

- New validation after parsing `vocalMode`/`lyrics`: if the resolved vocal
  mode is not `instrumental` and `lyrics` is blank, return
  `{ error: "lyrics_required" }` with status 400, before any credit check or
  Replicate call. This replaces MiniMax's "model improvises lyrics" fallback,
  which ACE-Step cannot do.
- Swap `buildMinimaxInput` call for `buildAceStepInput`.
- `replicate.predictions.create({ model: MINIMAX_MODEL, input })` becomes
  `replicate.predictions.create({ version: ACE_STEP_VERSION, input })` — the
  `model` key does not work for this community model (spike finding #2).
- `p_model: MINIMAX_MODEL` becomes `p_model: ACE_STEP_MODEL`.
- No change to `translateToEnglish` / `compileMusicPrompt` / `refineStylePrompt`
  call order or logic.

### `app/api/music/[id]/route.ts`

No changes — spike finding #4 confirmed identical output shape (mp3 URL in a
1-item array) to MiniMax.

### `lib/music-prompt/buildMusicPrompt.ts`

- Remove `LYRICLESS_VOCAL_GUIDANCE` and its call site (lines checked against
  current file: the `if (!instrumental && !input.lyrics?.trim())` branch that
  pushes it). Dead code once the route rejects lyricless vocal requests
  upstream — no reachable caller can hit this branch with empty lyrics anymore.

### Docs

- `docs/MINIMAX_PROMPT_ENGINEERING.md` → rewritten/renamed for ACE-Step (same
  structure: compiler formula table, dedup rules, etc. — only the target-model
  framing changes since the compiler itself is unchanged).
- `docs/chatgpt-project/*.md` mentions of MiniMax updated for consistency.
- Code comments referencing "MiniMax"/"minimax" across `lib/music.ts`,
  `lib/music-prompt/buildMusicPrompt.ts`, `lib/translatePrompt.ts`,
  `lib/refineStylePrompt.ts`, `lib/music-prompt/buildLyricsPayload.ts` updated
  or genericized (e.g. "the target music model" where model-agnostic).

### Tests

- Any test asserting MiniMax-specific strings/limits (`buildMusicPrompt.test.ts`
  and friends) updated to match new constants/wording where they encode
  MiniMax-specific assumptions.

## Error handling

- New: `lyrics_required` / 400 when a vocal mode is selected without lyrics —
  returned before any credit deduction or Replicate call, so no credit is
  spent on a rejected request.
- Unchanged: Replicate create failure still triggers
  `refund_failed_music_credit` and a 502, same as today. Polling/finalize
  error paths in `[id]/route.ts` are fully model-agnostic and untouched (no
  mp3/wav adjustment needed — spike confirmed identical output shape).

## Out of scope

- Duration UI control (fixed default only — see `## Future / Later` in
  `PLAN.md` if wanted later).
- Any MiniMax fallback/dual-model path — this is a clean removal, not a
  feature-flagged rollout.
- Re-tuning genre/mood presets for ACE-Step's specific taste — reuse as-is,
  revisit only if output quality testing shows a real gap.
