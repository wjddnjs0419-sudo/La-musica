import type {
  BuildMusicPromptInput,
  MusicGenre,
  MusicMood,
  MusicUseCase,
  ResolvedVocalMode,
} from "./types";

// Concrete style prompts per genre. These describe rhythm, drums, bass,
// arrangement, and production grammar without forcing vocal/instrumental mode.
export const GENRE_PRESETS: Record<Exclude<MusicGenre, "custom">, string> = {
  edm: "festival main-stage big-room EDM, chart-ready commercial hook, four-on-the-floor dance pulse around 126-130 BPM, hard sidechained kick, offbeat open hats, towering layered supersaw leads, screaming chopped vocal-chop hook texture, wide sub bass, explosive snare-roll build-ups, white-noise riser sweeps, euphoric main-stage drop dynamics, loud radio-ready electronic mix",
  reggaeton: "modern Medellin-style commercial reggaeton, glossy radio-pop sheen, groove-first dembow pocket with kick on the downbeats and snare-clap accents between beats, syncopated shaker and rim percussion, rolling sub and 808 bass following the groove, catchy plucked synth or nylon-guitar hook, warm tropical chord stabs, confident late-night perreo energy, tight chart-ready Latin urban mix",
  hiphop_trap: "modern commercial trap, hard-hitting half-time trap drums, booming distorted 808 slides, crisp 16th-note hi-hat rolls with triplet fills, punchy snare on beat three, dark cinematic minor-key piano or bell motif, atmospheric pads, sparse menacing negative space, open pocket for rhythmic lead phrasing, loud streaming-ready low-end heavy mix",
  techno: "peak-time warehouse techno, relentless pounding four-on-the-floor kick, rolling 16th-note bassline, driving closed-hat pulse, metallic percussion loops, hypnotic dark minor synth sequence, long gradual filter automation, filtered risers, intense breakdown tension, cavernous warehouse reverb, loud club master",
  korean_ballad: "modern Korean drama OST ballad, slow-to-mid tempo arrangement, intimate piano or acoustic guitar intro, warm piano arpeggios, lush string orchestra swells, restrained verse dynamics, surging emotional pre-chorus lift, huge belted final-chorus payoff, dramatic drum build into the last chorus, polished radio-ready mix",
  brazilian_funk: "modern baile funk, raw favela party energy, tamborzao-driven rhythmic pattern, immediate rhythmic hook, fast syncopated kick and clap hits, heavy distorted 808 pulses, baile percussion fills, whistle accents, short call-and-response hook spaces, gritty loud club loudness",
  afropop_festival: "modern commercial Afrobeats festival sound, sunny stadium-pop polish, Afrobeats drum pocket, syncopated kick pattern, shuffling hats, layered djembe and hand percussion, bright clean guitar riffs, warm brass stabs, buoyant melodic bassline, communal final-hook lift, spacious radio-ready festival dance mix",
  french_maghreb_hiphop: "modern French-Maghreb club rap, North African melodic minor phrases, darbuka-style percussion layers, bouncy French hip-hop drum groove, deep 808 bass, warm oriental synth lead, handclap accents, open pocket for rhythmic lead phrasing, anthemic club-ready chorus lift, triumphant global nightlife energy",
  football_chant: "massive stadium anthem, chantable terrace energy, stomp-clap pulse, big floor toms and snare hits, brass stabs, whistle accents, simple call-and-response hook shape, short repeatable hook phrasing, wide crowd-sized reverb, explosive sports-celebration chorus",
};

export const MOOD_PRESETS: Record<MusicMood, string> = {
  hard: "harder transients, compressed impact, aggressive edge",
  energetic: "driving pulse, lively motion, danceable lift",
  dark: "minor-key color, nocturnal tension, shadowy atmosphere",
  happy: "bright harmony, joyful lift, sunny tone",
  emotional: "heartfelt dynamics, dramatic lift, expressive phrasing",
  sexy: "smooth late-night groove, confident warmth, restrained tension",
  epic: "large-scale dynamics, cinematic rise, victorious payoff",
  funny: "playful timing, quirky accents, witty bounce",
  nostalgic: "warm texture, bittersweet harmony, reflective feel",
  romantic: "soft dynamics, dreamy space, intimate warmth",
  aggressive: "bold drums, hard-hitting accents, rebellious pressure",
  festival: "outdoor-stage energy, big chorus lift, celebratory motion",
};

export const USE_CASE_PRESETS: Record<Exclude<MusicUseCase, "custom">, string> = {
  workout: "steady motivational drive, strong beat continuity, physical momentum",
  club: "dancefloor low-end, clean groove repetition, late-night mix density",
  party: "catchy hook space, playful rhythm, group-friendly energy",
  short_form: "immediate opening hook, strong first five seconds, loopable payoff",
  gaming: "high-adrenaline pacing, sharp accents, highlight-montage momentum",
  travel_vlog: "forward motion, scenic brightness, upbeat lifestyle atmosphere",
  sports_chant: "chantable hook shape, claps and brass emphasis, stadium lift",
  comedy_roast: "bouncy timing, playful tension, room for funny storytelling",
  background: "clean arrangement, moderate density, supportive BGM balance",
  personal_song: "clear emotional arc, memorable hook, intimate storytelling space",
};

// Direction injected per resolved vocal mode.
export const VOCAL_PRESETS: Record<ResolvedVocalMode, string> = {
  instrumental: "fully instrumental, no vocals, no lyrics",
  male_vocal: "expressive male vocal",
  female_vocal: "expressive female vocal",
  rap_vocal: "confident rap vocal, rhythmic delivery",
  crowd_chant: "crowd chant vocals, easy sing-along hook",
};

// Known artist/song references -> generic descriptors (copyright-safe).
// WARNING: these regexes carry the `g` flag and are therefore global/stateful
// (each `.test()`/`.exec()` advances `lastIndex`). Use them ONLY with
// String.replace/replaceAll. Never call `.test()` on a shared instance — clone
// via `new RegExp(re.source, re.flags)` first if you need a boolean match.
export const REFERENCE_MAP: Array<[RegExp, string]> = [
  [/bad\s*bunny/gi, "fast Latin urban club sound, syncopated dembow-inspired drums, dark synths, deep 808 bass, confident late-night groove"],
  [/cris\s*mj|una\s*noche\s*en\s*medellin/gi, "dreamy nighttime Latin urban groove, smooth romantic synth melody, deep 808 bass, fast dembow-inspired rhythm, glossy club atmosphere"],
  [/soolking|suavemente/gi, "Maghreb-inspired French hip-hop dance energy, North African melodic influence, club percussion, catchy chorus lift"],
  [/임창정/g, "emotional 2000s Korean karaoke ballad feeling, dramatic breakup mood, powerful high-note chorus shape, piano and string arrangement"],
  [/karol\s*g/gi, "glossy modern Latin pop-reggaeton, bright commercial radio sheen, smooth confident groove, dembow-inspired drums, deep 808 bass, late-night perreo energy"],
  [/peso\s*pluma|corrido/gi, "modern regional Mexican corrido sound, acoustic guitar and brass-driven arrangement, laid-back confident groove, contemporary urban polish"],
  [/drake|travis\s*scott/gi, "modern commercial trap, dark atmospheric synths, booming distorted 808 bass, half-time hi-hat rolls, moody late-night mood"],
  [/burna\s*boy|wizkid|afrobeats?/gi, "modern Afrobeats groove, syncopated drum pocket, warm melodic bassline, bright guitar riffs, sunny commercial polish"],
];

// Valid concrete (post-`auto`) vocal modes. Typed as Set<string> so callers
// can membership-test raw/unvalidated strings without TS narrowing friction.
export const RESOLVED_VOCAL_MODES = new Set<string>([
  "instrumental",
  "male_vocal",
  "female_vocal",
  "rap_vocal",
  "crowd_chant",
]);

// Validity sets for the other unions, used by the compiler to keep persisted
// metadata free of bogus values. Typed as Set<string> on purpose.
export const VALID_GENRES = new Set<string>([
  "edm",
  "reggaeton",
  "hiphop_trap",
  "techno",
  "korean_ballad",
  "brazilian_funk",
  "afropop_festival",
  "french_maghreb_hiphop",
  "football_chant",
  "custom",
]);

export const VALID_MOODS = new Set<string>([
  "hard",
  "energetic",
  "dark",
  "happy",
  "emotional",
  "sexy",
  "epic",
  "funny",
  "nostalgic",
  "romantic",
  "aggressive",
  "festival",
]);

export const VALID_USE_CASES = new Set<string>([
  "workout",
  "club",
  "party",
  "short_form",
  "gaming",
  "travel_vlog",
  "sports_chant",
  "comedy_roast",
  "background",
  "personal_song",
  "custom",
]);

// Genres that imply vocals when the user leaves vocal mode on auto.
const RAP_GENRES = new Set<MusicGenre>(["hiphop_trap", "french_maghreb_hiphop"]);
const CHANT_GENRES = new Set<MusicGenre>(["football_chant"]);
const SUNG_GENRES = new Set<MusicGenre>(["korean_ballad", "afropop_festival", "brazilian_funk"]);

// Resolve `auto`/undefined vocal mode into a concrete one. Only a KNOWN
// concrete mode short-circuits; an unknown/bogus string falls through to the
// auto-resolution heuristics below.
export function resolveVocalMode(input: BuildMusicPromptInput): ResolvedVocalMode {
  if (input.vocalMode && input.vocalMode !== "auto" && RESOLVED_VOCAL_MODES.has(input.vocalMode))
    return input.vocalMode;
  if (input.lyrics && input.lyrics.trim()) return "male_vocal";
  if (input.genre && RAP_GENRES.has(input.genre)) return "rap_vocal";
  if (input.genre && CHANT_GENRES.has(input.genre)) return "crowd_chant";
  if (input.genre && SUNG_GENRES.has(input.genre)) return "male_vocal";
  return "instrumental";
}
