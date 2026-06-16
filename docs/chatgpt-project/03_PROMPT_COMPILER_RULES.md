# 03_PROMPT_COMPILER_RULES

Source of truth: `lib/music-prompt/buildMusicPrompt.ts`, `lib/music-prompt/presets.ts`, `lib/music.ts`, `app/api/music/generate/route.ts`

Purpose: Use this file as ChatGPT Project context when explaining or extending La Musica's prompt engineering.

## Compiler Version

Current compiler version: `v2`

## Product Principle

Normal users should not have to write dense prompt-engineering text.

Users write a simple idea and optional lyrics/options. The service internally compiles that into a high-density English MiniMax prompt.

The compiled prompt is server-side only:

- Browser sends raw prompt, lyrics, genre, moods, use case, vocal mode, and language.
- Server translates the raw user prompt to English when needed.
- Server compiles the final MiniMax prompt.
- `musics.prompt` stores the raw user prompt.
- `musics.metadata.final_music_prompt` stores the compiled prompt for debugging/auditing.

## Input Fields

`GenerateRequest` currently supports:

- `prompt`: required user text
- `lyrics`: optional user lyrics
- `instrumental`: legacy boolean, superseded by `vocalMode` when present
- `genre`: optional `MusicGenre`
- `moods`: optional list of `MusicMood`
- `useCase`: optional `MusicUseCase`
- `vocalMode`: optional `VocalMode`
- `language`: optional language cue for vocal tracks

Removed field:

- `style`: removed because users can write style in the main prompt and options already provide structured guidance.

## Compilation Order

The compiled prompt is user-first:

```text
prioritize this musical idea: <sanitized user intent>,
secondary style details: <genre preset>,
mood shading: <up to 2 mood presets>,
arrangement goal: <use-case preset>,
<vocal/instrumental direction>,
<lyricless vocal guidance if needed>,
<language cue if vocal>,
<quality booster>,
<BPM if provided>,
<key if provided>,
original composition only, do not imitate any specific artist, song, melody, or copyrighted track.
```

Why user-first:

- Selected options should steer the model, not overpower the user's prompt.
- Genre presets are lower-authority guidance.
- The user's prompt and lyrics are the strongest creative signal.

## Genre Guidance

Genre presets are injected only when `genre` is set and is not `custom`.

Genre presets describe concrete musical grammar:

- rhythm pattern
- kick/snare placement
- percussion texture
- bass motion
- instrument motifs
- energy curve
- mix density

Genre presets must not force:

- instrumental mode
- male vocal
- female vocal
- rap vocal
- crowd vocal

Vocal behavior belongs only to `VocalMode` resolution and `VOCAL_PRESETS`.

## Mood Guidance

Mood presets are lower-authority shading.

Only the first two selected moods are applied (`MAX_MOOD_GUIDANCE = 2`) to avoid adjective overload.

## Use-case Guidance

Use-case presets are injected only when `useCase` is set and is not `custom`.

They shape arrangement goals such as:

- workout momentum
- club mix density
- first-five-seconds hook
- travel-vlog brightness
- personal-song emotional arc

## Vocal / Instrumental Branch

Resolved vocal modes:

- `instrumental`
- `male_vocal`
- `female_vocal`
- `rap_vocal`
- `crowd_chant`

`auto` resolution:

1. Explicit valid mode wins.
2. Lyrics present -> `male_vocal`.
3. `hiphop_trap` or `french_maghreb_hiphop` -> `rap_vocal`.
4. `football_chant` -> `crowd_chant`.
5. `korean_ballad`, `afropop_festival`, `brazilian_funk` -> `male_vocal`.
6. Otherwise -> `instrumental`.

Instrumental prompt direction:

```text
fully instrumental, no vocals, no lyrics
full instrumental arrangement, strong instrumental presence, polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement
```

Vocal prompt direction:

```text
expressive male vocal
expressive female vocal
confident rap vocal, rhythmic delivery
crowd chant vocals, easy sing-along hook
vocal-centered but with rich full instrumental backing, strong chorus impact, polished professional mix, no acapella sections, no empty background
```

Lyricless vocal guidance:

```text
if no lyrics are provided, generate original simple singable lyrics that match the user's idea
```

Language cue:

- Added only for non-instrumental tracks.
- Shape: `sung in <language>`.

## Lyrics Payload Rules

For instrumental:

- `lyrics` is always omitted.
- MiniMax receives `is_instrumental: true`.

For vocal with user lyrics:

- Lyrics are normalized by `buildLyricsPayload`.
- Known section tags are normalized.
- Unstructured lyrics are wrapped in `[Verse]`.
- Lyrics are clamped to 3500 characters.

For vocal without user lyrics:

- `lyrics` remains omitted.
- Prompt includes lyricless vocal guidance.

## Reference Sanitization

Known artist/song references are replaced with generic descriptors:

- `bad bunny` -> fast Latin urban club sound, syncopated dembow-inspired drums, dark synths, deep 808 bass, confident late-night groove
- `cris mj` / `una noche en medellin` -> dreamy nighttime Latin urban groove, smooth romantic synth melody, deep 808 bass, fast dembow-inspired rhythm, glossy club atmosphere
- `soolking` / `suavemente` -> Maghreb-inspired French hip-hop dance energy, North African melodic influence, club percussion, catchy chorus lift
- `임창정` -> emotional 2000s Korean karaoke ballad feeling, dramatic breakup mood, powerful high-note chorus shape, piano and string arrangement

Risky phrases are stripped:

- `sounds exactly like`
- `exactly like`
- `same as`
- `copy`
- `똑같이`
- `동일하게`
- `그대로`
- `가사도 동일`

The copyright line is always appended:

```text
original composition only, do not imitate any specific artist, song, melody, or copyrighted track.
```

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
- Model decides length, usually 2-4 minutes, up to roughly 6 minutes.

