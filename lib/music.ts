// Shared music-generation helpers and types.

// meta/musicgen pinned version on Replicate (stereo-large).
export const MUSICGEN_MODEL = "meta/musicgen";
export const MUSICGEN_VERSION =
  "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb";

export const MUSICS_BUCKET = "musics";

export type MusicStatus = "pending" | "processing" | "completed" | "failed";

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
  duration_seconds: number | null;
  model: string | null;
  is_public: boolean;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Default clip length in seconds. musicgen's own default is 8; bump it up.
export const DEFAULT_DURATION = 30;

// Build the Replicate musicgen input payload from a user prompt.
export function buildMusicgenInput(prompt: string, duration = DEFAULT_DURATION) {
  return {
    prompt: prompt.trim(),
    model_version: "stereo-large",
    output_format: "mp3",
    normalization_strategy: "peak",
    duration,
  };
}

// Derive a short, human-friendly title from the prompt.
export function deriveTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Untitled";
  const firstLine = cleaned.split(/[.!?\n]/)[0].trim() || cleaned;
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}
