# ACE-Step Prompt Engineering — The Music Prompt Compiler

Developer reference for `lib/music-prompt/`, the server-side module that turns a
simple user intent + a few structured options into a dense English prompt for
the ACE-Step music model on Replicate.

Source of truth (read these alongside this doc):

- `lib/music-prompt/types.ts` — types + `PROMPT_COMPILER_VERSION` (`"v2"`)
- `lib/music-prompt/presets.ts` — genre/mood/use-case/vocal presets, `REFERENCE_MAP`, `resolveVocalMode`, validity sets
- `lib/music-prompt/sanitizeReferences.ts` — reference + risky-phrase sanitizer
- `lib/music-prompt/buildLyricsPayload.ts` — lyrics field normalizer
- `lib/music-prompt/buildMusicPrompt.ts` — the user-first prompt compiler
- `lib/music-prompt/index.ts` — `compileMusicPrompt` entry point
- `app/api/music/generate/route.ts` — where the compiler is wired in
- `lib/music.ts` — `buildAceStepInput`, model id, char limits

---

## 1. Why normal users don't write the final prompt

A good ACE-Step prompt is a comma-separated wall of English production
jargon ("massive big room drop, aggressive saw synth lead, pounding kick
drum…"). Most users can't and shouldn't write that. The product principle is:

- **Users describe intent simply** — a short free-text line ("헬스장에서 들을
  하드한 EDM") plus a few optional dropdowns (Genre / Mood / Use case / Vocal).
- **The compiler produces the dense English prompt** — `compileMusicPrompt`
  keeps the sanitized user text first, then adds lower-authority Genre / Mood /
  Use-case guidance and quality boosters.
- **The compiled prompt is server-side only.** `compileMusicPrompt` runs inside
  `app/api/music/generate/route.ts`. The browser never sends a final prompt and
  is never shown one by default. The `musics` row keeps the raw user text in its
  `prompt` column (`p_prompt: prompt`), and the full compiled prompt is persisted
  only in `musics.metadata` (`final_music_prompt`) for debugging/auditing — not
  surfaced in the UI.

This keeps the user-facing surface friendly while the model still receives a
high-quality, copyright-safe prompt.

---

## 2. The Music Prompt Compiler formula

Implemented in `lib/music-prompt/buildMusicPrompt.ts`. The compiler builds an
ordered list of segments, joins them with `, `, de-duplicates, clamps, and then
appends the copyright line. The guiding rule is:

> The user's prompt and lyrics are the source of truth. Options steer the model;
> they should not overpower the user's idea or contradict the selected vocal mode.

The conceptual formula and how each part maps to code:

| Part | Content | Source |
|------|---------|--------|
| 1 | User intent + reference text, sanitized and prefixed as the priority idea | `sanitizeReferences([referenceText, userDescription])` |
| 2 | Secondary genre guidance (skipped for `custom`/unset) | `GENRE_PRESETS[genre]` |
| 3 | Mood shading, max 2 selected moods | `MOOD_PRESETS[mood]` |
| 4 | Arrangement goal (skipped for `custom`/unset) | `USE_CASE_PRESETS[useCase]` |
| 9 | Vocal/instrumental direction | `VOCAL_PRESETS[resolvedVocalMode]` |
| 10 | Production/mix quality booster | `INSTRUMENTAL_BOOSTER` or `VOCAL_BOOSTER` |
| 11 | BPM and/or key, if provided | `` `${bpm} BPM` ``, `` `key of ${key}` `` |
| 12 | Safety/copyright instruction (always) | `COPYRIGHT_LINE` |

Instrumentation, tempo feel, arrangement, and production details are carried
inside the genre/mood/use-case preset strings rather than as separate code
branches.

Final shape (all segments comma-joined):

```
prioritize this musical idea: <sanitized user intent>, secondary style details: <genre guidance>, mood shading: <up to 2 moods>, arrangement goal: <use case>, <vocal direction>, <booster>, <NN BPM>, key of <key>, <COPYRIGHT_LINE>
```

The actual code order intentionally puts the sanitized intent **before** the
structured options. This avoids the earlier failure mode where selecting several
chips made generic presets dominate a better free-text prompt or lyric payload.

### De-duplication

Genre presets and the sanitized reference text can repeat the same phrase
(e.g. both a Latin style preset and an artist-reference replacement might emit
"808 bass"). `dedupeSegments` splits the body on `, `, lowercases each segment as a
key, and drops case-insensitive repeats while preserving first-occurrence order.

### Copyright line is always appended after clamping (never truncated)

`MAX_PROMPT_CHARS = 2000`. To guarantee the safety clause survives, the compiler:

1. Builds and de-dupes the **body without** the copyright line.
2. Clamps the body to `MAX_PROMPT_CHARS - COPYRIGHT_LINE.length - 2` (the `- 2`
   reserves room for the `", "` separator).
3. Appends `, ${COPYRIGHT_LINE}` last.

So even with a 2,500-char user description, the final prompt is `<= 2000` chars
**and** still ends with the full copyright clause. `COPYRIGHT_LINE` is:

```
original composition only, do not imitate any specific artist, song, melody, or copyrighted track.
```

---

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

---

## 4. Vocal vs instrumental

Two booster strings (`lib/music-prompt/buildMusicPrompt.ts`) enforce arrangement
quality and steer vocals:

- **`INSTRUMENTAL_BOOSTER`**
  `full instrumental arrangement, strong instrumental presence, polished
  professional mix, clear structure, no vocals, no lyrics, no sparse arrangement`
  — instrumental tracks explicitly forbid vocals ("no vocals, no lyrics") and
  carry no lyrics payload (`buildLyricsPayload` returns `undefined`).
- **`VOCAL_BOOSTER`**
  `vocal-centered but with rich full instrumental backing, strong chorus impact,
  polished professional mix, no acapella sections, no empty background`
  — vocal tracks demand a full instrumental bed ("rich full instrumental
  backing", "no acapella sections") so the model doesn't return a bare vocal.

In addition, `VOCAL_PRESETS[resolvedVocalMode]` adds a short direction segment
(e.g. `expressive male vocal`, `confident rap vocal, rhythmic delivery`,
`crowd chant vocals, easy sing-along hook`, or `fully instrumental, no vocals,
no lyrics`).

### `resolveVocalMode` auto-resolution

`resolveVocalMode(input)` in `presets.ts` turns `auto`/undefined/invalid into a
concrete `ResolvedVocalMode`, in this order:

1. **Explicit valid mode wins** — if `vocalMode` is set, not `"auto"`, and is a
   member of `RESOLVED_VOCAL_MODES`, return it as-is. (An unknown/bogus string
   does **not** short-circuit; it falls through to the heuristics.)
2. **Lyrics present → `male_vocal`** — if `input.lyrics` is non-empty.
3. **Genre heuristics** (when still on auto):
   - `RAP_GENRES` (`hiphop_trap`, `french_maghreb_hiphop`) → `rap_vocal`
   - `CHANT_GENRES` (`football_chant`) → `crowd_chant`
   - `SUNG_GENRES` (`korean_ballad`, `afropop_festival`, `brazilian_funk`) → `male_vocal`
4. **Otherwise → `instrumental`** (the safe default, e.g. for `edm`, `techno`,
   `reggaeton` with no other signal).

---

## 5. Genre / mood / use-case presets

All presets live in `lib/music-prompt/presets.ts`. They are concrete guidance
strings inserted with lower-authority prefixes such as `secondary style details`,
`mood shading`, and `arrangement goal`:

- `GENRE_PRESETS` — keyed by every concrete `MusicGenre` (all except `custom`).
- `MOOD_PRESETS` — keyed by every `MusicMood`.
- `USE_CASE_PRESETS` — keyed by every concrete `MusicUseCase` (all except `custom`).
- `VOCAL_PRESETS` — keyed by every `ResolvedVocalMode`.

Genre presets should not just repeat a label like "reggaeton beat" or "EDM".
They should describe sound-producing details the model can translate into audio:
rhythm pattern, kick/snare placement, percussion texture, bass motion,
instrument motifs, energy curve, and mix density. They must not force
`instrumental`, `male vocal`, `female vocal`, or `crowd vocals`; vocal mode is
owned by `VOCAL_PRESETS` and the resolved `vocalMode`.

`"custom"` (or an unset genre/use-case) means **no preset is injected** for that
slot; the sanitized user description carries the style instead. See the
`if (input.genre && input.genre !== "custom")` / `!== "custom"` guards in
`buildMusicPrompt.ts`.

Mood guidance is intentionally capped at two selected moods (`MAX_MOOD_GUIDANCE`)
so a user can click several chips without turning the prompt into adjective soup.

The compiler also validates union values before persisting metadata using
`VALID_GENRES`, `VALID_MOODS`, `VALID_USE_CASES`: bogus genre/use-case become
`undefined` and unknown moods are filtered out of `metadata`, so the stored
record stays clean even if the client sends garbage.

---

## 6. Reference sanitization

`sanitizeReferences(text)` in `lib/music-prompt/sanitizeReferences.ts` makes the
user's intent copyright-safe in two passes, then collapses whitespace:

**Pass 1 — known artist/song replacement** via `REFERENCE_MAP` (in `presets.ts`).
Each entry maps a regex to a generic descriptor string:

- `bad bunny` → "fast Latin urban club sound, syncopated dembow-inspired drums,
  dark synths, deep 808 bass, confident late-night groove"
- `cris mj` / `una noche en medellin` → "dreamy nighttime Latin urban groove,
  smooth romantic synth melody, deep 808 bass, fast dembow-inspired rhythm,
  glossy club atmosphere"
- `soolking` / `suavemente` → "Maghreb-inspired French hip-hop dance energy,
  North African melodic influence, club percussion, catchy chorus lift"
- `임창정` → "emotional 2000s Korean karaoke ballad feeling, dramatic breakup
  mood, powerful high-note chorus shape, piano and string arrangement"

**Pass 2 — risky-phrase stripping.** Phrases that ask the model to *copy* an
existing work are replaced with a space. The actual `RISKY_PATTERNS`:

- `/\bsound(s)?\s+exactly\s+like\b/gi`
- `/\bexactly\s+like\b/gi`
- `/\bsame\s+as\b/gi`
- `/\bcopy\b/gi`
- `/똑같이/g`
- `/동일하게/g`
- `/그대로/g`
- `/가사도\s*동일/g`

**Always-appended copyright line.** `sanitizeReferences` itself does **not** add
the copyright line — the compiler appends `COPYRIGHT_LINE` once at the end of the
prompt (see section 2). That line is the backstop.

### Limitations

- Sanitization is a **known-list** mechanism. An arbitrary unknown artist name
  (one not in `REFERENCE_MAP`) cannot be auto-detected and will pass through
  verbatim into the prompt. The always-appended copyright line is the safety net
  for that case — it instructs the model not to imitate any specific artist.
- The `REFERENCE_MAP` regexes carry the global `g` flag, so they are
  **stateful** (`lastIndex` advances across calls). Use them **only** with
  `String.replace` / `replaceAll`. Never call `.test()` or `.exec()` on a shared
  instance — clone via `new RegExp(re.source, re.flags)` first if you need a
  boolean match. (See the warning comment above `REFERENCE_MAP` in `presets.ts`.)

---

## 7. Adding a new genre preset

To add a genre end-to-end:

1. **`lib/music-prompt/types.ts`** — add the new key to the `MusicGenre` union.
2. **`lib/music-prompt/presets.ts`**:
   - Add the concrete rhythm/drum/bass/instrumentation guidance to
     `GENRE_PRESETS` (keyed by the new value; the
     `Record<Exclude<MusicGenre, "custom">, string>` type will force this).
   - Do not include vocal/instrumental decisions in the genre preset.
   - Add the new value to `VALID_GENRES` (so it survives the metadata validity
     check in `buildMusicPrompt.ts`).
3. **`components/prompt-box.tsx`** — add a `{ value, label }` entry to
   `GENRE_OPTIONS` so the dropdown offers it.
4. **(Optional) auto vocal-mode sets** in `lib/music-prompt/presets.ts` — if the
   new genre implies vocals, add it to one of `RAP_GENRES`, `CHANT_GENRES`, or
   `SUNG_GENRES` so `resolveVocalMode` picks the right default when the user
   leaves Vocal on `auto`. Otherwise it defaults to `instrumental`.

(Adding a mood or use-case follows the same pattern: union in `types.ts`, preset
+ validity set in `presets.ts`, options list in `prompt-box.tsx`.)

---

## 8. Example inputs and final prompts

These are the four canonical examples from
`lib/music-prompt/buildMusicPrompt.test.ts`. Each shows the input and the key
substrings the compiled `prompt`/`lyrics` are asserted to contain. The shared
copyright substring asserted in every case is:

```
original composition only, do not imitate any specific artist
```

### Example 1 — Hard EDM workout, instrumental @128

Input:
```ts
{
  userDescription: "헬스장에서 들을 하드한 EDM",
  genre: "edm",
  moods: ["hard", "energetic"],
  useCase: "workout",
  vocalMode: "instrumental",
  bpm: 128,
}
```
Result: `instrumental === true`, `lyrics === undefined`,
`metadata.vocal_mode === "instrumental"`,
`metadata.prompt_version === "v2"`, `prompt.length <= 2000`.
Prompt starts with the user's idea and contains: `sidechained kick`,
`steady motivational drive`, `no vocals, no lyrics`,
`clean electronic festival mix`, `128 BPM`, copyright.

### Example 2 — Travel reggaeton, instrumental

Input:
```ts
{
  userDescription: "친구들이랑 여행 영상에 쓸 레게톤",
  genre: "reggaeton",
  moods: ["happy", "energetic"],
  useCase: "travel_vlog",
  vocalMode: "instrumental",
}
```
Prompt contains: `dembow groove`, `syncopated shaker`,
`rolling sub and 808 bass`, `forward motion`, `no vocals, no lyrics`,
copyright.

### Example 3 — Emotional Korean ballad, male vocal

Input:
```ts
{
  userDescription: "비 오는 밤 소주 마시면서 생각나는 한국 발라드",
  genre: "korean_ballad",
  moods: ["emotional", "nostalgic"],
  vocalMode: "male_vocal",
  language: "Korean",
  lyrics: "[verse]\n비가 내린다",
}
```
Result: `instrumental === false`, `metadata.language === "Korean"`.
Prompt contains: `Korean ballad arrangement`, `string orchestra`,
`rich full instrumental backing`, `no acapella sections`, copyright.
`lyrics` contains `[Verse]` (the lowercase `[verse]` tag is normalized).

### Example 4 — Bad Bunny reference, sanitized away

Input:
```ts
{
  userDescription: "Bad Bunny 스타일 빠른 레게톤",
  referenceText: "Bad Bunny",
  genre: "reggaeton",
  moods: ["sexy", "energetic"],
  vocalMode: "instrumental",
}
```
Prompt does **not** contain `bad bunny` (case-insensitive). Prompt contains:
`Latin urban` (from the `REFERENCE_MAP` replacement), `808 bass`, copyright.
