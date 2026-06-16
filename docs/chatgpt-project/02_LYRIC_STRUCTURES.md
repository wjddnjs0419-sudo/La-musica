# 02_LYRIC_STRUCTURES

Source of truth: `lib/music-prompt/buildLyricsPayload.ts`, `lib/music-prompt/presets.ts`, `lib/music-prompt/buildMusicPrompt.ts`

Purpose: Use this file as ChatGPT Project context when creating lyrics or deciding how lyrics should be formatted for La Musica.

Important: La Musica does not currently maintain separate hardcoded lyric templates such as "viral song structure" or "Korean ballad structure" in the app. The current project supports a lightweight lyrics payload system: optional lyrics, normalized section tags, vocal-mode branching, and MiniMax-compatible payload limits.

## Lyrics Are Optional

Lyrics are optional in the product.

When the user provides lyrics:

- The app sends those words as the MiniMax `lyrics` field for vocal tracks.
- The app normalizes known section tags.
- Unstructured lyrics are wrapped in `[Verse]`.
- Lyrics are clamped to 3500 characters.

When the user does not provide lyrics:

- Instrumental tracks send no lyrics.
- Vocal tracks also send no `lyrics` payload.
- The compiled prompt adds this instruction: `if no lyrics are provided, generate original simple singable lyrics that match the user's idea`.

## Instrumental Behavior

If resolved vocal mode is `instrumental`:

- `buildLyricsPayload` returns `undefined`.
- `buildMinimaxInput` omits `lyrics`.
- MiniMax receives `is_instrumental: true`.
- The prompt includes `fully instrumental, no vocals, no lyrics`.
- The instrumental booster adds: `full instrumental arrangement, strong instrumental presence, polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement`.

## Vocal Behavior

Supported vocal modes:

- `male_vocal`: expressive male vocal
- `female_vocal`: expressive female vocal
- `rap_vocal`: confident rap vocal, rhythmic delivery
- `crowd_chant`: crowd chant vocals, easy sing-along hook
- `auto`: resolved by compiler heuristics

For vocal tracks:

- MiniMax receives `is_instrumental: false`.
- User-provided lyrics are preserved.
- Section tags are normalized.
- If no lyrics are provided, no lyrics field is sent, but the prompt asks MiniMax to generate original simple singable lyrics.
- The vocal booster adds: `vocal-centered but with rich full instrumental backing, strong chorus impact, polished professional mix, no acapella sections, no empty background`.

## Auto Vocal Resolution

`resolveVocalMode` follows this order:

1. Explicit non-auto vocal mode wins.
2. If user lyrics are present, resolve to `male_vocal`.
3. `hiphop_trap` or `french_maghreb_hiphop` resolves to `rap_vocal`.
4. `football_chant` resolves to `crowd_chant`.
5. `korean_ballad`, `afropop_festival`, or `brazilian_funk` resolves to `male_vocal`.
6. Otherwise resolve to `instrumental`.

## Supported Section Tags

These tags are recognized and normalized when they appear inside square brackets:

- `[Intro]`
- `[Verse]`
- `[Verse 2]`
- `[Pre Chorus]`
- `[Chorus]`
- `[Hook]`
- `[Post Chorus]`
- `[Bridge]`
- `[Final Chorus]`
- `[Outro]`

Normalization examples:

- `[verse]` becomes `[Verse]`
- `[CHORUS]` becomes `[Chorus]`
- `[prechorus]` becomes `[Pre Chorus]`

Unknown tags are preserved as written.

## Recommended ChatGPT Output Format For Lyrics

When ChatGPT creates lyrics for this project, prefer compact section-tagged lyrics that fit MiniMax's `lyrics` field.

Use supported tags only unless there is a strong reason not to.

Good default structures for the current app:

### Short Vocal Song

```text
[Verse]
...

[Chorus]
...
```

### Hook-centered Song

```text
[Intro]
...

[Hook]
...

[Verse]
...

[Hook]
...
```

### Full Vocal Song

```text
[Verse]
...

[Pre Chorus]
...

[Chorus]
...

[Verse 2]
...

[Bridge]
...

[Final Chorus]
...
```

### Crowd Chant

```text
[Intro]
...

[Hook]
...

[Verse]
...

[Final Chorus]
...
```

### Rap Vocal

```text
[Intro]
...

[Verse]
...

[Hook]
...

[Verse 2]
...

[Hook]
...
```

## What Not To Do

- Do not write or request lyrics for instrumental tracks.
- Do not copy existing artists' lyrics.
- Do not imitate a specific copyrighted song or melody.
- Do not rely on a separate Style field; La Musica removed that field. Style should be expressed in the main prompt or selected options.

