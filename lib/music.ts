// Shared music-generation helpers and types.

import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  ReggaetonScene,
  ReggaetonStyle,
  VocalMode,
} from "@/lib/music-prompt/types";

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


// Payload sent from the prompt box to POST /api/music/generate.
export interface GenerateRequest {
  prompt: string;
  lyrics?: string;
  instrumental?: boolean;
  genre?: MusicGenre;
  style?: ReggaetonStyle;
  scene?: ReggaetonScene;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  language?: string;
  duration?: number;
}

// Validate an edited track title. Returns the trimmed title when it is a real
// change, or null when it is empty or unchanged (caller should skip the update).
export function resolveRenameTitle(draft: string, current: string): string | null {
  const next = draft.trim();
  if (!next || next === current) return null;
  return next;
}
