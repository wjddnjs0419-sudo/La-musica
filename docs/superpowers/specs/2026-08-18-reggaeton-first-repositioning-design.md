# Reggaeton-First Repositioning Design

## Goal

Reposition La Musica as a Reggaeton-first AI music creation product without
changing the existing lyrics, credit, storage, polling, reconciliation, or
library lifecycle.

## Scope

P0 includes the landing Hero and CTA, the Step 2 Sound experience, the
Reggaeton-only server contract and prompt mapping, and language-auto behavior.
Google Lyria 3 Pro is already the active provider; this work verifies its
continued use rather than migrating it again.

Out of scope: Step 1 redesign, Step 3 redesign, library/player redesign,
pricing changes, new analytics infrastructure, and migration of existing music.

## Product Rules

- Every new generation uses `reggaeton` as its internal genre.
- Users choose a Reggaeton `style`, not a genre.
- Prompt engineering and model-specific terminology remain internal.
- Existing stored songs and in-flight legacy ACE-Step jobs remain compatible.
- A Simple sound selection needs either a quick preset or a non-empty sound
  description.

## Landing Experience

`HeroSection` keeps its current left-copy/right-product-preview layout.

- Hero copy:
  - eyebrow: `LA MUSICA`
  - H1: `What if the club played your song tonight?`
  - subcopy: `Create your own reggaeton track with AI — your vibe, your lyrics, your sound.`
  - CTA: `Create Your Track`
- The first supplied club image becomes the Hero background. It uses a
  left-to-right dark gradient and mobile bottom fade. The image focal point is
  kept on the right, while the existing preview remains readable on a dark
  translucent surface.
- CTA copy:
  - H2: `Don’t just dance to it. Make it.`
  - subcopy: `Create your own reggaeton track with La Musica.`
  - CTA: `Create Your Track`
- The second supplied club image becomes the CTA background, with a centered
  dark vignette for readable content at all breakpoints.
- Homepage metadata and JSON-LD description describe a Reggaeton creation
  product rather than a generic lyrics-to-song generator.

## Sound Form

The Create Song modal stays a three-step flow. Step 1 and Step 3 retain their
current UI and behavior. Step 2 retains its Simple/Advanced mode switch.

### Form State

The form replaces editable `genre` and `useCase` with:

- `style`: `old_school | reggaeton_pop | perreo | romantic | trapeton | neoperreo | ""`
- `scene`: `club | late_night | beach | party | ""`
- `simplePreset`: `club_heat | after_midnight | dangerous_love | summer_nights | ""`

It retains `prompt`, `soundDirection`, `lyrics`, `moods`, `vocalMode`,
`language`, and `duration`.

`simplePreset` is derived from the current style/mood/scene combination rather
than trusted as an independent configuration. This prevents a highlighted
preset label from disagreeing with the actual advanced settings.

### Simple Mode

Show these selectable quick presets:

| Preset | Style | Mood | Scene |
| --- | --- | --- | --- |
| Club Heat | Perreo | Sexy | Club |
| After Midnight | Trapetón | Dark | Late Night |
| Dangerous Love | Romantic | Dark | Late Night |
| Summer Nights | Reggaeton Pop | Energetic | Beach |

Also show optional `Describe your sound` text with the placeholder `Smooth
late-night reggaeton with a catchy hook`. A preset, text, or both is valid.
Continue is disabled only when neither is present.

### Advanced Mode

Advanced exposes optional controls in this order:

1. Style: Old School, Reggaeton Pop, Perreo, Romantic, Trapetón, Neoperreo;
   exactly zero or one selection. Helper text appears on desktop hover and for
   the selected option on mobile.
2. Mood: Sexy, Energetic, Dark, Romantic, Confident, Chill; any number may be
   selected.
3. Vocal: the existing Auto, Instrumental, Male Vocal, Female Vocal, and Rap
   controls. Crowd chant is not exposed by this Reggaeton UX.
4. Duration: the existing 60-second and 180-second options.
5. Language: Auto, Spanish, Spanglish, English, Portuguese; default Auto.
6. Scene: Club, Late Night, Beach, Party; exactly zero or one selection.
7. Optional `Anything else about the sound?` text, with the PRD placeholder.

Quick presets, Genre, and Use case do not appear in Advanced.

Switching modes never resets sound state. Selecting a preset synchronizes the
underlying Advanced values. Changing those values automatically clears the
matching Simple active state.

## Generation Contract and Prompt Compilation

`GenerateRequest` and the POST route accept the new `style` and `scene`
fields. The client no longer sends selectable genres or use cases. The server
sets `genre: "reggaeton"` for every new request before compilation, ignoring
any client-supplied genre.

The prompt compiler receives Reggaeton-specific style and scene preset text in
addition to the existing genre, mood, vocal, and language guidance. The
Reggaeton genre base remains present for every new song. Style and Scene are
validated allowlists; unknown values are omitted from metadata and prompt
guidance.

The current external/persisted `genre` metadata remains a `MusicGenre` and is
saved as `reggaeton`. New metadata records validated `style` and `scene` so
future UI can reconstruct the selection. Existing records require no
migration.

## Lyrics Language Rules

- User-provided lyrics remain unchanged; no language rewrite occurs.
- An explicit selected language is passed to automatic lyric generation and
  prompt compilation.
- `Auto` is stored as absent rather than sent as a literal language.
- With Auto and no lyrics, automatic lyrics are generated in Spanish.
- Spanglish requests explicitly ask the lyrics generator for a natural Spanish
  and English mix; the music prompt uses the same label.

## Reliability and Compatibility

The generation route still owns authentication, credit reservation, translation,
automatic lyrics, provider prediction creation, persistent storage,
finalization, refunds, and cost logging. The active provider remains
`google/lyria-3-pro`; ACE-Step remains registered solely to resolve legacy
jobs. No stored music, job, or cost row is rewritten.

## Analytics

Existing GA4 installation is left unchanged. Before adding events, inspect the
current event architecture. If no existing abstraction exists, log a follow-up
rather than introduce one in this repositioning task.

## Testing and QA

- Unit tests cover Simple validation, preset-to-form mapping, mode
  synchronization, request serialization, and invalid value rejection.
- Compiler tests cover Reggaeton enforcement, every Style and Scene guidance,
  and language-auto handling.
- Route tests cover server genre enforcement and Auto-to-Spanish lyric input.
- Existing provider, credit, refund, polling, and reconciliation tests remain
  green.
- Manually inspect Hero and CTA at desktop, tablet, and mobile widths for copy
  contrast, crop, preview collision, and CTA readability.
- Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Decisions

- The first user-supplied nightclub image is the Hero asset; the second is the
  CTA asset.
- Lyria 3 Pro is already integrated and is not reimplemented.
- The work is a positioning experiment; no comparative or unvalidated product
  claims are added.
