import type { GenerateRequest } from "@/lib/music";
import type { MusicMood, ReggaetonScene, ReggaetonStyle, VocalMode } from "@/lib/music-prompt/types";
import type { ReggaetonSimplePreset } from "@/lib/music-prompt/reggaeton";

export type CreateSongFormState = {
  prompt: string;
  soundDirection: string;
  lyrics: string;
  style: ReggaetonStyle | "";
  scene: ReggaetonScene | "";
  simplePreset: ReggaetonSimplePreset | "";
  moods: MusicMood[];
  vocalMode: VocalMode;
  language: string;
  duration: 60 | 180;
};

export const CREATE_SONG_INITIAL_STATE: CreateSongFormState = {
  prompt: "",
  soundDirection: "",
  lyrics: "",
  style: "",
  scene: "",
  simplePreset: "",
  moods: [],
  vocalMode: "auto",
  language: "",
  duration: 180,
};

export function canContinueFromSound(
  state: Pick<CreateSongFormState, "prompt"> & { simplePreset?: string },
  mode: "simple" | "advanced",
) {
  return mode === "advanced" || Boolean(state.prompt.trim() || state.simplePreset);
}

export const STYLE_OPTIONS: Array<{ value: ReggaetonStyle; label: string; hint: string }> = [
  { value: "old_school", label: "Old School", hint: "Raw, classic dembow" }, { value: "reggaeton_pop", label: "Reggaeton Pop", hint: "Polished & catchy" }, { value: "perreo", label: "Perreo", hint: "Heavy & club-ready" }, { value: "romantic", label: "Romantic", hint: "Smooth & sensual" }, { value: "trapeton", label: "Trapetón", hint: "Dark 808s & trap influence" }, { value: "neoperreo", label: "Neoperreo", hint: "Experimental & futuristic" },
];
export const SCENE_OPTIONS: Array<{ value: ReggaetonScene; label: string }> = [{ value: "club", label: "Club" }, { value: "late_night", label: "Late Night" }, { value: "beach", label: "Beach" }, { value: "party", label: "Party" }];

export const MOOD_OPTIONS: Array<{ value: MusicMood; label: string }> = [
  { value: "energetic", label: "Energetic" },
  { value: "dark", label: "Dark" },
  { value: "sexy", label: "Sexy" },
  { value: "romantic", label: "Romantic" },
  { value: "confident", label: "Confident" },
  { value: "chill", label: "Chill" },
];

export const VOCAL_OPTIONS: Array<{ value: VocalMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "instrumental", label: "Instrumental" },
  { value: "male_vocal", label: "Male vocal" },
  { value: "female_vocal", label: "Female vocal" },
  { value: "rap_vocal", label: "Rap vocal" },
];

export const LANGUAGE_OPTIONS = [
  { value: "", label: "Auto" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Español" },
  { value: "Portuguese", label: "Português" },
  { value: "Spanglish", label: "Spanglish" },
];

/*export const USE_CASE_OPTIONS: Array<{ value: MusicUseCase; label: string }> = [
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
];*/

/*export const CREATE_SONG_PRESETS: Array<{
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
];*/

export function toggleMoodSelection(
  current: MusicMood[],
  mood: MusicMood,
): MusicMood[] {
  if (current.includes(mood)) return current.filter((item) => item !== mood);
  return [...current, mood];
}

export function buildCreateSongRequest(
  state: CreateSongFormState,
): GenerateRequest {
  const promptParts = [state.prompt.trim(), state.soundDirection.trim()].filter(
    Boolean,
  );

  return {
    prompt: promptParts.join(". ") || "Reggaeton track",
    lyrics: state.lyrics.trim() || undefined,
    instrumental: state.vocalMode === "instrumental",
    genre: "reggaeton",
    style: state.style || undefined,
    scene: state.scene || undefined,
    moods: state.moods.length ? state.moods : undefined,
    vocalMode: state.vocalMode,
    language: state.language || undefined,
    duration: state.duration,
  };
}
