import type { GenerateRequest } from "@/lib/music";
import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

export type CreateSongFormState = {
  prompt: string;
  soundDirection: string;
  lyrics: string;
  genre: MusicGenre | "";
  moods: MusicMood[];
  useCase: MusicUseCase | "";
  vocalMode: VocalMode;
  language: string;
  duration: 60 | 180;
};

export const CREATE_SONG_INITIAL_STATE: CreateSongFormState = {
  prompt: "",
  soundDirection: "",
  lyrics: "",
  genre: "",
  moods: [],
  useCase: "",
  vocalMode: "auto",
  language: "",
  duration: 180,
};

export const GENRE_OPTIONS: Array<{ value: MusicGenre; label: string }> = [
  { value: "edm", label: "EDM" },
  { value: "reggaeton", label: "Reggaeton" },
  { value: "hiphop_trap", label: "Hip-hop / Trap" },
  { value: "techno", label: "Techno" },
  { value: "korean_ballad", label: "Korean Ballad" },
  { value: "brazilian_funk", label: "Brazilian Funk" },
  { value: "afropop_festival", label: "Afropop Festival" },
  { value: "french_maghreb_hiphop", label: "French Maghreb Hip-hop" },
  { value: "football_chant", label: "Football Chant" },
];

export const MOOD_OPTIONS: Array<{ value: MusicMood; label: string }> = [
  { value: "hard", label: "Hard" },
  { value: "energetic", label: "Energetic" },
  { value: "dark", label: "Dark" },
  { value: "happy", label: "Happy" },
  { value: "emotional", label: "Emotional" },
  { value: "sexy", label: "Sexy" },
  { value: "epic", label: "Epic" },
  { value: "funny", label: "Funny" },
  { value: "nostalgic", label: "Nostalgic" },
  { value: "romantic", label: "Romantic" },
  { value: "aggressive", label: "Aggressive" },
  { value: "festival", label: "Festival" },
];

export const VOCAL_OPTIONS: Array<{ value: VocalMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "instrumental", label: "Instrumental" },
  { value: "male_vocal", label: "Male vocal" },
  { value: "female_vocal", label: "Female vocal" },
  { value: "rap_vocal", label: "Rap vocal" },
  { value: "crowd_chant", label: "Crowd chant" },
];

export const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Korean", label: "한국어" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Portuguese", label: "Português" },
  { value: "Arabic", label: "العربية" },
];

export const USE_CASE_OPTIONS: Array<{ value: MusicUseCase; label: string }> = [
  { value: "workout", label: "Workout" },
  { value: "club", label: "Club" },
  { value: "party", label: "Party" },
  { value: "short_form", label: "Short-form" },
  { value: "gaming", label: "Gaming" },
  { value: "travel_vlog", label: "Travel Vlog" },
  { value: "sports_chant", label: "Sports Chant" },
  { value: "comedy_roast", label: "Comedy Roast" },
  { value: "background", label: "Background" },
  { value: "personal_song", label: "Personal Song" },
];

export const CREATE_SONG_PRESETS: Array<{
  label: string;
  genre?: MusicGenre;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  duration?: 60 | 180;
}> = [
  {
    label: "Football Chant",
    genre: "football_chant",
    vocalMode: "crowd_chant",
    moods: ["energetic", "aggressive"],
    useCase: "sports_chant",
  },
  {
    label: "Meme",
    genre: "hiphop_trap",
    moods: ["funny"],
    useCase: "short_form",
    duration: 60,
  },
  {
    label: "Sports Hype",
    moods: ["energetic", "epic", "aggressive"],
    useCase: "sports_chant",
  },
];

export function toggleMoodSelection(
  current: MusicMood[],
  mood: MusicMood,
): MusicMood[] {
  if (current.includes(mood)) return current.filter((item) => item !== mood);
  if (current.length >= 3) return current;
  return [...current, mood];
}

export function buildCreateSongRequest(
  state: CreateSongFormState,
): GenerateRequest {
  const promptParts = [state.prompt.trim(), state.soundDirection.trim()].filter(
    Boolean,
  );

  return {
    prompt: promptParts.join(". "),
    lyrics: state.lyrics.trim() || undefined,
    instrumental: state.vocalMode === "instrumental",
    genre: state.genre || undefined,
    moods: state.moods.length ? state.moods : undefined,
    useCase: state.useCase || undefined,
    vocalMode: state.vocalMode,
    language: state.language || undefined,
    duration: state.duration,
  };
}
