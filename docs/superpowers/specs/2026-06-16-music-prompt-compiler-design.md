# Music Prompt Compiler — Design

Date: 2026-06-16
Status: Approved

## Background

The app generates music via `minimax/music-2.6` on Replicate. Users currently
type a free-text prompt plus optional Lyrics / Style / Instrumental toggles
(`components/prompt-box.tsx` → `GenerateRequest` → `app/api/music/generate/route.ts`
→ `buildMinimaxInput` in `lib/music.ts`). The raw user text is passed almost
verbatim to the model, so quality depends entirely on the user's prompting skill.

**Product principle:** the user is NOT a prompt engineer. They describe music
simply ("hard EDM for workout"); the app internally compiles that into a
high-quality English MiniMax prompt, hidden from normal users.

## Goal

Add an internal "Music Prompt Compiler" that turns simple intent + structured
options into a consistent, information-dense English MiniMax prompt and a
matching lyrics payload. Existing generation must keep working; no API keys on
the client; payment/credit logic unchanged.

## Decisions (approved)

- **UI:** add structured option chips (Genre, Mood [multi], Use-case, Vocal) to
  the prompt box. The existing boolean **Instrumental toggle is folded into the
  Vocal select** (`instrumental` option). All options optional → unselected means
  `auto` (server infers from free text).
- **Storage:** persist compiler fields in the existing `musics.metadata` JSONB —
  no migration. `musics.prompt` stays the raw user text (used for title/display);
  the compiled prompt goes to `metadata.final_music_prompt` and to Replicate.
- **Testing:** introduce **vitest** scoped to `lib/music-prompt` pure logic. This
  satisfies the session's TDD requirement while keeping `npm run build` +
  `npm run lint` as the overall gate.

## Architecture

New pure-logic module (no I/O, no secrets), runnable on server:

```
lib/music-prompt/
  types.ts               MusicGenre | MusicMood | MusicUseCase | VocalMode,
                         BuildMusicPromptInput, CompiledPrompt, PROMPT_COMPILER_VERSION = "v1"
  presets.ts             GENRE_PRESETS, MOOD_PRESETS, USE_CASE_PRESETS, VOCAL_PRESETS,
                         REFERENCE_MAP (artist/song → generic descriptors)
  sanitizeReferences.ts  sanitizeReferences(text): strip artist/song names + risky
                         phrasing, return generic descriptors; copyright line appended by compiler
  buildLyricsPayload.ts  buildLyricsPayload(input): normalize section tags; instrumental →
                         structural tags only (no sung words)
  buildMusicPrompt.ts    buildMusicPrompt(input): CompiledPrompt
  index.ts               compileMusicPrompt() entry + re-exports
docs/MINIMAX_PROMPT_ENGINEERING.md
```

### Types (from task, adapted)

`MusicGenre`: edm | reggaeton | hiphop_trap | techno | korean_ballad |
brazilian_funk | afropop_festival | french_maghreb_hiphop | football_chant | custom

`MusicMood`: hard | energetic | dark | happy | emotional | sexy | epic | funny |
nostalgic | romantic | aggressive | festival

`MusicUseCase`: workout | club | party | short_form | gaming | travel_vlog |
sports_chant | comedy_roast | background | personal_song | custom

`VocalMode`: instrumental | male_vocal | female_vocal | rap_vocal | crowd_chant | auto

```ts
type BuildMusicPromptInput = {
  userDescription: string;
  genre?: MusicGenre;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  language?: string;
  lyrics?: string;
  bpm?: number;
  key?: string;
  durationHint?: string;
  referenceText?: string;
};

type CompiledPrompt = {
  prompt: string;            // final English MiniMax prompt (<= MAX_PROMPT_CHARS)
  lyrics?: string;           // normalized lyrics payload (vocal) or structural tags (instrumental, only if needed)
  instrumental: boolean;     // is_instrumental flag
  metadata: {
    raw_user_description: string;
    final_music_prompt: string;
    prompt_version: string;  // PROMPT_COMPILER_VERSION
    genre?: MusicGenre;
    moods?: MusicMood[];
    use_case?: MusicUseCase;
    vocal_mode: VocalMode;   // resolved (auto → concrete)
    language?: string;
  };
};
```

### Compiler formula (12 parts → final shape)

`[genre/style], [mood], [use case], [rhythm/drums], [bass], [main instruments],
[arrangement], [vocal/instrumental mode], [production/mix], [BPM/key],
original composition only, do not imitate any specific artist, song, melody, or
copyrighted track.`

Quality booster appended by mode:
- instrumental: "full instrumental arrangement, strong instrumental presence,
  polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement"
- vocal: "vocal-centered but with rich full instrumental backing, strong chorus
  impact, polished professional mix, no acapella sections, no empty background"

Genre/Mood/Use-case preset strings are taken verbatim from the task. When
`genre` is `custom`/unset, the sanitized user description + reference descriptors
carry the style. Final prompt is clamped to `MAX_PROMPT_CHARS` (2000).

### Vocal mode handling

- instrumental → `instrumental=true`, add strong "no vocals, no lyrics"; no sung lyrics.
- male_vocal / female_vocal / rap_vocal / crowd_chant → `instrumental=false`, add the
  matching vocal direction.
- auto → infer: explicit `lyrics` present, or genre in {korean_ballad,
  hiphop_trap, football_chant, ...vocal-leaning} → vocal; otherwise instrumental.
  The resolved mode is stored in metadata.

### Reference sanitization (hybrid, best-effort)

`sanitizeReferences(text)`:
1. Replace known references via `REFERENCE_MAP` (Bad Bunny, Cris MJ "Una Noche en
   Medellin", Soolking "Suavemente", 임창정, …) with generic descriptors.
2. Strip risky phrasing: "same as", "exactly like", "copy", "똑같이", "동일하게",
   "그대로", "가사도 동일" (and reasonable variants).
3. Return generic descriptors only. The compiler always appends the copyright line.

Limitation (documented): arbitrary unknown artist names cannot be fully detected;
the copyright line is the backstop.

### Lyrics payload

`buildLyricsPayload(input)`:
- Vocal + user lyrics present → preserve text, normalize section tags
  ([Intro]/[Verse]/[Pre Chorus]/[Chorus]/[Hook]/[Bridge]/[Final Chorus]/[Outro]);
  do NOT rewrite words (no lyric-generation step exists in the app).
- Vocal + unstructured lyrics → wrap in simple [Verse]/[Chorus] tags.
- Instrumental → no sung words. Only if the model needs a lyrics field, emit
  structural tags ([Instrumental]/[Build Up]/[Drop]/[Break]/[Final Drop]/[Outro]).
  Current `buildMinimaxInput` drops `lyrics` when `is_instrumental` is true, so for
  instrumental we send no lyrics; structural tags are produced but unused unless
  the integration changes.

## Integration

### `lib/music.ts`
No behavioral change to `buildMinimaxInput` (already supports prompt / lyrics /
is_instrumental). `GenerateRequest` extended with the structured fields (all
optional) so the client can pass them.

### `app/api/music/generate/route.ts`
1. Parse new optional fields (genre, moods, useCase, vocalMode, language) plus
   existing prompt/lyrics/style/instrumental.
2. Call `compileMusicPrompt({ userDescription: prompt, ... })` server-side.
3. Pass `compiled.prompt` / `compiled.lyrics` / `compiled.instrumental` to
   `buildMinimaxInput`.
4. `create_music_with_credit`: keep `p_prompt = raw user text`,
   `p_title = deriveTitle(raw)`, `p_metadata = { ...existing, ...compiled.metadata }`.

`style` continues to be accepted and folded into the description the compiler sees.

### `components/prompt-box.tsx`
- Add selects/chips: Genre (single), Mood (multi), Use-case (single), Vocal (single).
- Remove standalone Instrumental toggle; Vocal select carries the instrumental option.
- Keep Lyrics + Style as-is.
- `handleSubmit` emits the extended `GenerateRequest`.
- No "Advanced prompt" editor in v1 (YAGNI); compiled prompt is server-side only.

### `components/music-workspace.tsx`
Pass new fields through if it constructs the payload; otherwise unchanged.

## Testing

- vitest dev dependency + `npm run test` script.
- Unit tests for `lib/music-prompt`:
  - sanitizeReferences: Bad Bunny / Cris MJ / 임창정 → no artist name, generic
    descriptors present; risky phrasing stripped.
  - buildMusicPrompt: the 4 task example inputs produce prompts containing the
    listed required substrings; instrumental includes "no vocals, no lyrics";
    vocal includes "rich full instrumental backing" / "no acapella"; copyright
    line always present; length <= 2000.
  - buildLyricsPayload: tag normalization; instrumental yields no sung words.
- `npm run build` + `npm run lint` remain the overall gate.

## Acceptance criteria

- Existing generation still works.
- Simple input → richer English MiniMax prompt.
- Instrumental songs carry clear "no vocals, no lyrics".
- Vocal songs carry rich backing direction, avoid acapella/sparse.
- Artist/song references never passed verbatim; copyright line always appended.
- Compiler is typed, pure, reusable, unit-tested.
- Final prompt stored in `musics.metadata.final_music_prompt` with `prompt_version`.
- `npm run build` + `npm run lint` pass; no client-exposed keys; credit logic unchanged.

## Out of scope (v1)

- User-facing advanced/editable prompt view.
- DB column migration (metadata JSONB only).
- Lyric generation/rewriting.
- Automatic detection of arbitrary unknown artist names beyond REFERENCE_MAP.
