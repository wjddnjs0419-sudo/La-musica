// Shared music-generation helpers and types.

import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

// MiniMax Music 2.6 on Replicate. Official model — referenced by name, no
// pinned version hash. Sings lyrics (vocals + instrumentation); model decides
// length (2-4 min typical, 6 min max), so there is no duration control.
export const MINIMAX_MODEL = "minimax/music-2.6";

export const MUSICS_BUCKET = "musics";

export type MusicStatus = "pending" | "processing" | "completed" | "failed";
export type ThumbnailStatus = "pending" | "succeeded" | "failed";

export interface Music {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  status: MusicStatus;
  audio_url: string | null;
  audio_key: string | null;
  cover_url: string | null;
  cover_key: string | null;
  thumbnail_url: string | null;
  thumbnail_key: string | null;
  thumbnail_prompt: string | null;
  thumbnail_status: ThumbnailStatus | null;
  duration_seconds: number | null;
  model: string | null;
  is_public: boolean;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// MiniMax input limits.
const MAX_PROMPT_CHARS = 2000;
const MAX_LYRICS_CHARS = 3500;

// Payload sent from the prompt box to POST /api/music/generate.
export interface GenerateRequest {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
  genre?: MusicGenre;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  language?: string;
}

// Build the Replicate minimax/music-2.6 input payload. `prompt` carries the
// musical description (genre, BPM, key, vocal type, mood). `lyrics` are actually
// sung — unless `instrumental` is set, in which case lyrics are dropped and a
// vocal-free track is produced.
export function buildMinimaxInput({
  prompt,
  lyrics,
  instrumental = false,
}: {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
}) {
  const composedPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);
  const trimmedLyrics = lyrics?.trim().slice(0, MAX_LYRICS_CHARS);

  return {
    prompt: composedPrompt,
    is_instrumental: instrumental,
    audio_format: "mp3",
    ...(instrumental || !trimmedLyrics ? {} : { lyrics: trimmedLyrics }),
  };
}

// Derive a short, human-friendly title from the prompt.
export function deriveTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Untitled";
  const firstLine = cleaned.split(/[.!?\n]/)[0].trim() || cleaned;
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}
