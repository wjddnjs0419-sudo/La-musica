// Music Prompt Compiler — shared types and version.

export const PROMPT_COMPILER_VERSION = "v1";

export type MusicGenre =
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

export type MusicMood =
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

export type MusicUseCase =
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

export type VocalMode =
  | "instrumental"
  | "male_vocal"
  | "female_vocal"
  | "rap_vocal"
  | "crowd_chant"
  | "auto";

// Concrete vocal mode after `auto` is resolved.
export type ResolvedVocalMode = Exclude<VocalMode, "auto">;

export interface BuildMusicPromptInput {
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
}

export interface CompiledPromptMetadata {
  raw_user_description: string;
  final_music_prompt: string;
  prompt_version: string;
  genre?: MusicGenre;
  moods?: MusicMood[];
  use_case?: MusicUseCase;
  vocal_mode: ResolvedVocalMode;
  language?: string;
}

export interface CompiledPrompt {
  prompt: string;
  lyrics?: string;
  instrumental: boolean;
  metadata: CompiledPromptMetadata;
}
