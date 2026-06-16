import type {
  BuildMusicPromptInput,
  MusicGenre,
  MusicMood,
  MusicUseCase,
  ResolvedVocalMode,
} from "./types";

// Strong default style prompts per genre (verbatim from product spec).
export const GENRE_PRESETS: Record<Exclude<MusicGenre, "custom">, string> = {
  edm: "Hard energetic EDM festival instrumental, massive big room drop, aggressive saw synth lead, pounding kick drum, distorted electro bass, explosive build-up, intense risers, crowd festival energy, polished mainstage EDM production",
  reggaeton: "Instrumental Latin reggaeton club beat, strong dembow rhythm, punchy kick, tight snare, deep 808 bass, syncopated Latin percussion, catchy plucked synth lead, warm tropical accents, polished modern Latin urban production",
  hiphop_trap: "Dark hip-hop trap instrumental, heavy 808 bass, crisp hi-hat rolls, punchy snare, eerie piano loop, atmospheric pads, deep sub bass, bouncy groove, freestyle-ready modern rap beat, clean polished mix",
  techno: "Hard driving techno instrumental, powerful four-on-the-floor kick, rolling bassline, hypnotic synth sequence, industrial percussion, dark warehouse atmosphere, evolving filter sweeps, intense club mix",
  korean_ballad: "Emotional 2000s Korean male ballad, dramatic breakup song, heartfelt male vocal, powerful high-note chorus, warm piano, emotional string orchestra, acoustic guitar, gradual drum build-up, explosive final chorus, polished Korean karaoke ballad production",
  brazilian_funk: "Brazilian funk carioca inspired party anthem, aggressive tamborzao rhythm, heavy 808 bass, fast percussion, whistle hits, clap rhythm, viral dance energy, playful chant hook, polished club mix",
  afropop_festival: "French Afro-pop festival anthem, joyful African vocal performance, powerful Afrobeat drums, energetic djembe percussion, bright guitar riffs, warm brass section, heavy bassline, crowd chanting, sunny outdoor festival atmosphere",
  french_maghreb_hiphop: "Maghreb-inspired French hip-hop and dance anthem, North African melodic influence, French rap vocal, catchy club chorus, bouncy drums, warm oriental synth melodies, darbuka-style percussion, deep 808 bass, triumphant global nightlife mood",
  football_chant: "High-energy football stadium anthem, powerful crowd vocals, loud drums, heavy bass, brass hits, clap rhythm, whistle sounds, easy sing-along hook, explosive chorus, sports celebration atmosphere",
};

export const MOOD_PRESETS: Record<MusicMood, string> = {
  hard: "aggressive, intense, powerful, high-impact",
  energetic: "fast-moving, exciting, danceable, high-energy",
  dark: "minor key, moody, nocturnal, cinematic",
  happy: "bright, joyful, uplifting, sunny",
  emotional: "heartfelt, dramatic, melancholic, expressive",
  sexy: "seductive, smooth, late-night, confident",
  epic: "large-scale, cinematic, victorious, anthemic",
  funny: "playful, comedic, meme-like, witty",
  nostalgic: "warm, bittersweet, reflective, old memories",
  romantic: "soft, dreamy, intimate, warm",
  aggressive: "bold, punchy, hard-hitting, rebellious",
  festival: "crowd energy, outdoor stage, celebration, chantable",
};

export const USE_CASE_PRESETS: Record<Exclude<MusicUseCase, "custom">, string> = {
  workout: "gym energy, driving rhythm, motivational intensity",
  club: "nightclub-ready groove, heavy low-end, dancefloor energy",
  party: "fun group energy, catchy hook, playful rhythm",
  short_form: "immediate hook, strong first 5 seconds, viral loop potential",
  gaming: "high-adrenaline action, highlight montage energy",
  travel_vlog: "sunny movement, scenic atmosphere, upbeat lifestyle mood",
  sports_chant: "stadium crowd, chantable hook, claps and brass",
  comedy_roast: "playful diss energy, funny storytelling, bouncy beat",
  background: "usable as BGM, clean arrangement, not too distracting",
  personal_song: "personal story, memorable hook, emotional clarity",
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
export const REFERENCE_MAP: Array<[RegExp, string]> = [
  [/bad\s*bunny/gi, "fast Latin reggaeton and Latin trap club sound, dark synths, deep 808 bass, confident low male vocal"],
  [/cris\s*mj|una\s*noche\s*en\s*medellin/gi, "instrumental Latin reggaeton club beat, dreamy nighttime urban atmosphere, smooth romantic synth melody, deep 808 bass, fast dembow rhythm"],
  [/soolking|suavemente/gi, "Maghreb-inspired French hip-hop dance anthem, North African melodic influence, club percussion, catchy French chorus"],
  [/임창정/g, "emotional 2000s Korean male karaoke ballad, dramatic breakup mood, powerful high-note chorus, piano and string arrangement"],
];

// Genres that imply vocals when the user leaves vocal mode on auto.
const RAP_GENRES = new Set<MusicGenre>(["hiphop_trap", "french_maghreb_hiphop"]);
const CHANT_GENRES = new Set<MusicGenre>(["football_chant"]);
const SUNG_GENRES = new Set<MusicGenre>(["korean_ballad", "afropop_festival", "brazilian_funk"]);

// Resolve `auto`/undefined vocal mode into a concrete one.
export function resolveVocalMode(input: BuildMusicPromptInput): ResolvedVocalMode {
  if (input.vocalMode && input.vocalMode !== "auto") return input.vocalMode;
  if (input.lyrics && input.lyrics.trim()) return "male_vocal";
  if (input.genre && RAP_GENRES.has(input.genre)) return "rap_vocal";
  if (input.genre && CHANT_GENRES.has(input.genre)) return "crowd_chant";
  if (input.genre && SUNG_GENRES.has(input.genre)) return "male_vocal";
  return "instrumental";
}
