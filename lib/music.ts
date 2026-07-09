// Shared music-generation helpers and types.

import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

// ACE-Step 1.5 (fishaudio/ace-step-1.5) on Replicate. Community model — the
// Replicate API rejects prediction creation by `model` name alone for it
// (verified 2026-07-10: returns 422 "version is required"), so the version
// hash must be pinned and passed as `version`, not `model`, in
// replicate.predictions.create. Diffusion-based: generates a full song with
// vocals in single-digit seconds of GPU compute (predict_time was ~6s for a
// 20s test track), unlike the old MiniMax integration's 2-4 minute
// autoregressive generation. Sings lyrics; duration is an explicit input
// (unlike MiniMax, which decided length itself) — fixed at
// ACE_STEP_DURATION_SECONDS below for parity with the old no-duration-control
// UX. Has no `is_instrumental` boolean: instrumental tracks are signaled by
// sending the literal string "[Instrumental]" as `lyrics` (the field's own
// schema default).
export const ACE_STEP_MODEL = "fishaudio/ace-step-1.5";
export const ACE_STEP_VERSION =
  "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85";
export const ACE_STEP_DURATION_SECONDS = 180;

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

// ACE-Step input limits. `prompt` is capped at ~500 chars — the model's
// schema documents a ~512-char soft cap and is tuned for short descriptor
// prompts, unlike MiniMax's 2000-char comma soup (the pre-refine compiled
// prompt in buildMusicPrompt.ts is still allowed to run long; refineStylePrompt
// is what compresses it down to this limit before it reaches ACE-Step).
// `lyrics` cap matches ACE-Step's 4096-char field limit (well above what this
// app ever produces).
const MAX_PROMPT_CHARS = 500;
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

// Build the Replicate fishaudio/ace-step-1.5 input payload. `prompt` carries
// the musical description (genre, BPM, key, vocal type, mood). ACE-Step has
// no `is_instrumental` boolean: instrumental tracks are signaled by sending
// the literal string "[Instrumental]" as `lyrics`. Non-instrumental tracks
// always receive real lyrics in production — the caller
// (`app/api/music/generate/route.ts`) rejects vocal-mode requests with no
// lyrics before this function is ever invoked — but this function still
// falls back to "[Instrumental]" defensively if `lyrics` is somehow empty,
// matching the belt-and-suspenders style of the old `buildMinimaxInput`.
export function buildAceStepInput({
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
    lyrics: instrumental || !trimmedLyrics ? "[Instrumental]" : trimmedLyrics,
    duration: ACE_STEP_DURATION_SECONDS,
    audio_format: "mp3",
  };
}

// Validate an edited track title. Returns the trimmed title when it is a real
// change, or null when it is empty or unchanged (caller should skip the update).
export function resolveRenameTitle(draft: string, current: string): string | null {
  const next = draft.trim();
  if (!next || next === current) return null;
  return next;
}
