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
  edm: "four-on-the-floor dance rhythm around 126-132 BPM, punchy sidechained kick, offbeat open hats, layered supersaw chord stabs, wide sub bass, snare-roll build-ups, rising noise sweeps, bright high-energy drop dynamics, clean electronic festival mix",
  reggaeton: "dembow groove with kick on the downbeats and snare-clap accents between beats, syncopated shaker and rim percussion, rolling sub and 808 bass following the groove, short plucked synth or nylon-guitar motif, warm tropical chord stabs, tight modern Latin urban mix",
  hiphop_trap: "half-time trap drum pattern, booming 808 slides, crisp 16th-note hi-hat rolls with triplet fills, punchy snare on beat three, sparse minor-key piano or bell motif, atmospheric pads, open pocket for rhythmic lead phrasing, clean low-end heavy mix",
  techno: "relentless four-on-the-floor kick, rolling 16th-note bassline, closed-hat pulse, metallic percussion loops, hypnotic minor synth sequence, filtered risers, breakdown tension, dark warehouse reverb, tight club master",
  korean_ballad: "slow-to-mid tempo Korean ballad arrangement, warm piano arpeggios, acoustic guitar support, lyrical string orchestra swells, restrained verse dynamics, wide emotional chorus lift, drum build into the final chorus, polished karaoke-ready mix",
  brazilian_funk: "tamborzao-inspired rhythmic pattern, fast syncopated kick and clap hits, heavy distorted 808 pulses, baile percussion fills, whistle accents, short call-and-response hook spaces, raw party energy, polished club loudness",
  afropop_festival: "Afrobeats-inspired drum pocket, syncopated kick pattern, shuffling hats, layered djembe and hand percussion, bright clean guitar riffs, warm brass stabs, buoyant bassline, sunny outdoor stage dynamics, spacious dance mix",
  french_maghreb_hiphop: "North African melodic minor phrases, darbuka-style percussion, bouncy hip-hop drum groove, deep 808 bass, warm oriental synth lead, handclap accents, club-ready chorus lift, triumphant global nightlife energy",
  football_chant: "stadium anthem rhythm, stomp-clap pulse, big floor toms and snare hits, brass stabs, whistle accents, simple call-and-response hook shape, wide crowd-sized reverb, explosive chorus lift, sports celebration energy",
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
