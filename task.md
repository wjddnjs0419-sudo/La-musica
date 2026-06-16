You are working on my AI music generation web app.

We currently use MiniMax Music 2.5 through an API provider, likely Replicate or a similar server-side API integration. I want to improve generation quality by adding an internal prompt engineering layer.

Important product principle:
The user is NOT a prompt engineer.
The user should only describe the music simply, like:

* “hard EDM for workout”
* “instrumental reggaeton club beat”
* “funny Korean hip-hop song about my friends”
* “emotional Korean ballad”
* “World Cup football chant”

The app must internally convert that simple user intent into a high-quality MiniMax 2.5 prompt.

Do not expose complicated prompt engineering to the user by default.
The final MiniMax prompt should be generated automatically and hidden from normal users.
Optionally add an “Advanced prompt” debug/edit view only if it fits the current UI.

Reference materials to consider:

* MiniMax Music Generation Guide:
  https://platform.minimax.io/docs/guides/music-generation
* MiniMax Music API Reference:
  https://platform.minimax.io/docs/api-reference/music-generation
* MiniMax official music generation skill:
  https://github.com/MiniMax-AI/skills/blob/main/skills/minimax-music-gen/SKILL.md
* Replicate MiniMax Music 2.5:
  https://replicate.com/minimax/music-2.5
* Scenario MiniMax Music 2.5 documentation:
  https://docs.scenario.com/get-started/generation/audio-generation/audio-generation-minimax
* General AI music prompt guide:
  https://help.artlist.io/hc/en-us/articles/34821392670749-AI-Toolkit-Generating-AI-Music
* General music prompting principle:
  Effective prompts usually include genre, mood, tempo/BPM, instruments, vocal style, arrangement/structure, use case, and production/mix direction.

Core goal:
Implement a “Music Prompt Compiler” that takes simple user input plus selected options and produces a consistent, high-quality MiniMax 2.5 prompt.

Important MiniMax-specific assumptions:

1. MiniMax prompt should be written in English for best quality.
2. `prompt` should describe style, mood, genre, scenario, instrumentation, tempo, vocal style, arrangement, and production quality.
3. `lyrics` should contain the actual lyrics for vocal songs.
4. For vocal songs, use structure tags such as:
   [Intro], [Verse], [Pre Chorus], [Chorus], [Hook], [Post Chorus], [Bridge], [Final Chorus], [Outro]
5. For instrumental songs, inspect the currently used MiniMax 2.5 API schema before adding any parameter.

   * Do NOT invent unsupported parameters.
   * If the current provider supports an instrumental flag, use it.
   * If it does not, follow the current project’s existing instrumental approach.
   * If lyrics are required by the API, use minimal structure tags like:
     [Instrumental]
     [Build Up]
     [Drop]
     [Break]
     [Final Drop]
     [Outro]
   * The prompt must strongly include “no vocals, no lyrics”.
6. Keep the final prompt within the provider’s prompt length limit. Prefer concise but information-dense prompts.

Implement these files or similar based on the current project structure:

* lib/music-prompt/types.ts
* lib/music-prompt/presets.ts
* lib/music-prompt/buildMusicPrompt.ts
* lib/music-prompt/buildLyricsPayload.ts
* lib/music-prompt/sanitizeReferences.ts
* lib/music-prompt/index.ts
* docs/MINIMAX_PROMPT_ENGINEERING.md

If the project already has a better folder convention, follow the existing convention instead.

Data model / types:
Create or adapt types similar to:

type MusicGenre =
| "edm"
| "reggaeton"
| "hiphop_trap"
| "techno"
| "korean_ballad"
| "brazilian_funk"
| "afropop_festival"
| "french_maghreb_hiphop"
| "football_chant"
| "custom";

type MusicMood =
| "hard"
| "energetic"
| "dark"
| "happy"
| "emotional"
| "sexy"
| "epic"
| "funny"
| "nostalgic"
| "romantic"
| "aggressive"
| "festival";

type MusicUseCase =
| "workout"
| "club"
| "party"
| "short_form"
| "gaming"
| "travel_vlog"
| "sports_chant"
| "comedy_roast"
| "background"
| "personal_song"
| "custom";

type VocalMode =
| "instrumental"
| "male_vocal"
| "female_vocal"
| "rap_vocal"
| "crowd_chant"
| "auto";

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

Prompt compiler formula:
The final MiniMax prompt should be composed from:

1. User intent summary
2. Genre preset
3. Mood preset
4. Use-case preset
5. Rhythm/drum direction
6. Bass direction
7. Main instruments
8. Arrangement/structure direction
9. Vocal or instrumental direction
10. Production/mix quality direction
11. BPM/key if provided
12. Safety/copyright avoidance instruction

General final prompt shape:
[Genre/style], [mood], [use case/scenario], [rhythm/drums], [bass], [main instruments], [arrangement], [vocal/instrumental mode], [production/mix], [BPM/key], original composition only, do not imitate any specific artist, song, melody, or copyrighted track.

Always append a quality booster:

* For instrumental:
  “full instrumental arrangement, strong instrumental presence, polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement”
* For vocal songs:
  “vocal-centered but with rich full instrumental backing, strong chorus impact, polished professional mix, no acapella sections, no empty background”

Copyright / reference handling:
Users may type things like:

* “Bad Bunny style”
* “Cris MJ Una Noche en Medellin 느낌”
* “Soolking Suavemente 느낌”
* “임창정 느낌”

Do NOT pass exact artist names, exact song names, or “sound exactly like” wording to the music API.
Instead, convert references into generic descriptors.

Examples:

* “Bad Bunny style” → “fast Latin reggaeton and Latin trap club sound, dark synths, deep 808 bass, confident low male vocal”
* “Cris MJ Una Noche en Medellin” → “instrumental Latin reggaeton club beat, dreamy nighttime urban atmosphere, smooth romantic synth melody, deep 808 bass, fast dembow rhythm”
* “Soolking Suavemente” → “Maghreb-inspired French hip-hop dance anthem, North African melodic influence, club percussion, catchy French chorus”
* “임창정 느낌” → “emotional 2000s Korean male karaoke ballad, dramatic breakup mood, powerful high-note chorus, piano and string arrangement”

Implement `sanitizeReferences()`:

* Detect common risky phrasing:
  “same as”, “exactly like”, “copy”, “똑같이”, “동일하게”, “그대로”, “가사도 동일”
* Remove or rewrite artist/song names from the final model prompt.
* Keep only generic musical descriptors.
* Always append:
  “original composition only, do not imitate any specific artist, song, melody, or copyrighted track.”

Genre presets:
Create a preset map with strong default prompts.

EDM:
“Hard energetic EDM festival instrumental, massive big room drop, aggressive saw synth lead, pounding kick drum, distorted electro bass, explosive build-up, intense risers, crowd festival energy, polished mainstage EDM production”

Reggaeton:
“Instrumental Latin reggaeton club beat, strong dembow rhythm, punchy kick, tight snare, deep 808 bass, syncopated Latin percussion, catchy plucked synth lead, warm tropical accents, polished modern Latin urban production”

Hip-hop / Trap:
“Dark hip-hop trap instrumental, heavy 808 bass, crisp hi-hat rolls, punchy snare, eerie piano loop, atmospheric pads, deep sub bass, bouncy groove, freestyle-ready modern rap beat, clean polished mix”

Techno:
“Hard driving techno instrumental, powerful four-on-the-floor kick, rolling bassline, hypnotic synth sequence, industrial percussion, dark warehouse atmosphere, evolving filter sweeps, intense club mix”

Korean Ballad:
“Emotional 2000s Korean male ballad, dramatic breakup song, heartfelt male vocal, powerful high-note chorus, warm piano, emotional string orchestra, acoustic guitar, gradual drum build-up, explosive final chorus, polished Korean karaoke ballad production”

Brazilian Funk:
“Brazilian funk carioca inspired party anthem, aggressive tamborzão rhythm, heavy 808 bass, fast percussion, whistle hits, clap rhythm, viral dance energy, playful chant hook, polished club mix”

Afropop Festival:
“French Afro-pop festival anthem, joyful African vocal performance, powerful Afrobeat drums, energetic djembe percussion, bright guitar riffs, warm brass section, heavy bassline, crowd chanting, sunny outdoor festival atmosphere”

French Maghreb Hip-hop:
“Maghreb-inspired French hip-hop and dance anthem, North African melodic influence, French rap vocal, catchy club chorus, bouncy drums, warm oriental synth melodies, darbuka-style percussion, deep 808 bass, triumphant global nightlife mood”

Football Chant:
“High-energy football stadium anthem, powerful crowd vocals, loud drums, heavy bass, brass hits, clap rhythm, whistle sounds, easy sing-along hook, explosive chorus, sports celebration atmosphere”

Mood presets:

* hard: “aggressive, intense, powerful, high-impact”
* energetic: “fast-moving, exciting, danceable, high-energy”
* dark: “minor key, moody, nocturnal, cinematic”
* happy: “bright, joyful, uplifting, sunny”
* emotional: “heartfelt, dramatic, melancholic, expressive”
* sexy: “seductive, smooth, late-night, confident”
* epic: “large-scale, cinematic, victorious, anthemic”
* funny: “playful, comedic, meme-like, witty”
* nostalgic: “warm, bittersweet, reflective, old memories”
* romantic: “soft, dreamy, intimate, warm”
* aggressive: “bold, punchy, hard-hitting, rebellious”
* festival: “crowd energy, outdoor stage, celebration, chantable”

Use-case presets:

* workout: “gym energy, driving rhythm, motivational intensity”
* club: “nightclub-ready groove, heavy low-end, dancefloor energy”
* party: “fun group energy, catchy hook, playful rhythm”
* short_form: “immediate hook, strong first 5 seconds, viral loop potential”
* gaming: “high-adrenaline action, highlight montage energy”
* travel_vlog: “sunny movement, scenic atmosphere, upbeat lifestyle mood”
* sports_chant: “stadium crowd, chantable hook, claps and brass”
* comedy_roast: “playful diss energy, funny storytelling, bouncy beat”
* background: “usable as BGM, clean arrangement, not too distracting”
* personal_song: “personal story, memorable hook, emotional clarity”

Vocal mode handling:

* instrumental:
  Add “no vocals, no lyrics” very clearly.
  Do not generate singing instructions.
* male_vocal:
  Add “expressive male vocal”.
* female_vocal:
  Add “expressive female vocal”.
* rap_vocal:
  Add “confident rap vocal, rhythmic delivery”.
* crowd_chant:
  Add “crowd chant vocals, easy sing-along hook”.
* auto:
  Infer from genre and lyrics.

Lyrics handling:
Implement `buildLyricsPayload()`:

* If user provides lyrics for a vocal song, preserve the lyrics but normalize section tags.
* Do not rewrite user lyrics unless the current app already has a lyric-generation step.
* If the user provides unstructured lyrics, optionally wrap them in simple structure tags:
  [Verse]
  ...
  [Chorus]
  ...
* If the song is instrumental, do not generate actual words.
* If the API requires a lyrics field for instrumental mode, use only structural tags and instrumental instructions, not sung lyrics.
* For vocal songs, encourage clear structure:
  [Verse]
  [Pre Chorus]
  [Chorus]
  [Verse 2]
  [Bridge]
  [Final Chorus]
  [Outro]

User input UI:
If the current UI has only one prompt textarea, keep it working.
But add or support structured options if reasonable:

* Genre
* Mood
* Use case
* Vocal mode
* Language
* Lyrics
* Additional description
* Advanced prompt toggle, optional

Normal users should not need to write advanced prompts.
The app should generate the final MiniMax prompt internally.

Server/API integration:

* Use the generated final prompt when calling MiniMax 2.5.
* Do not expose API keys on the client.
* Do not change payment/credit logic unless required by existing code structure.
* Store the final generated prompt for debugging and quality improvement.

Recommended DB fields if available:

* raw_user_description
* final_music_prompt
* prompt_version
* prompt_metadata
* lyrics_payload
* genre
* moods
* use_case
* vocal_mode

If DB schema changes are too invasive, store at least the final prompt wherever song generation records are currently stored.

Prompt versioning:
Add a constant:
PROMPT_COMPILER_VERSION = "v1"

Save this version with generated songs if possible.
This will help compare quality later.

Examples for tests or manual QA:

Example 1:
Input:
{
userDescription: "헬스장에서 들을 하드한 EDM",
genre: "edm",
moods: ["hard", "energetic"],
useCase: "workout",
vocalMode: "instrumental",
bpm: 128
}

Expected final prompt should contain:

* hard energetic EDM
* workout
* massive drop
* pounding kick
* aggressive synth
* no vocals, no lyrics
* polished mainstage EDM production
* 128 BPM

Example 2:
Input:
{
userDescription: "친구들이랑 여행 영상에 쓸 레게톤",
genre: "reggaeton",
moods: ["happy", "energetic"],
useCase: "travel_vlog",
vocalMode: "instrumental"
}

Expected final prompt should contain:

* instrumental Latin reggaeton
* dembow rhythm
* tropical percussion
* travel vibe
* no vocals, no lyrics
* polished modern Latin urban production

Example 3:
Input:
{
userDescription: "비 오는 밤 소주 마시면서 생각나는 한국 발라드",
genre: "korean_ballad",
moods: ["emotional", "nostalgic"],
vocalMode: "male_vocal",
language: "Korean",
lyrics: "[Verse]..."
}

Expected final prompt should contain:

* emotional 2000s Korean male ballad
* dramatic breakup song
* heartfelt male vocal
* piano
* string orchestra
* explosive final chorus
* rich full instrumental backing
* no acapella sections

Example 4:
Input:
{
userDescription: "Bad Bunny 스타일 빠른 레게톤",
referenceText: "Bad Bunny",
genre: "reggaeton",
moods: ["sexy", "energetic"],
vocalMode: "instrumental"
}

Expected behavior:

* Final prompt must NOT include “Bad Bunny”.
* Final prompt should include generic descriptors:
  fast Latin reggaeton, Latin trap club sound, dark synths, deep 808 bass, dembow rhythm.
* Final prompt must include:
  original composition only, do not imitate any specific artist, song, melody, or copyrighted track.

Documentation:
Create docs/MINIMAX_PROMPT_ENGINEERING.md explaining:

1. Why normal users should not write final prompts.
2. The Music Prompt Compiler formula.
3. MiniMax 2.5 prompt guidelines.
4. How vocal and instrumental songs differ.
5. How genre/mood/use-case presets work.
6. How artist/song references are sanitized.
7. How to add a new genre preset.
8. Example inputs and final prompts.

Acceptance criteria:

* Existing music generation still works.
* Simple user input is converted into a richer English MiniMax prompt.
* Instrumental songs include clear “no vocals, no lyrics” direction.
* Vocal songs include rich backing music direction and avoid acapella/sparse results.
* Artist/song references are not passed directly to the model.
* Prompt compiler is typed and reusable.
* Final prompt is stored or logged for debugging.
* TypeScript build passes.
* Lint passes if the project uses linting.
* No API keys are exposed to the client.
* Payment/credit logic remains unchanged.
