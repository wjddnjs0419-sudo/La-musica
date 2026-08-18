import type { Music } from "./music";
import { getMusicGenerationProvider } from "./music-generation/provider";
import { resolveGenerationReference } from "./music-generation/reference";
import type { MusicGenerationProvider } from "./music-generation/types";

// How long a row may stay in "processing" before it is declared timed out.
export const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface ReconcileDeps {
  getProvider?: (id: string) => MusicGenerationProvider | null;
  downloadAudio(url: string): Promise<Uint8Array>;
  uploadAudio(key: string, bytes: Uint8Array): Promise<{ url: string; key: string }>;
  getAudioUrl(key: string): string;
  markCompleted(musicId: string, audioUrl: string, audioKey: string): Promise<void>;
  refundAndMarkFailed(musicId: string, userId: string, reason: string): Promise<void>;
}

export type ReconcileOutcome =
  | "pending"
  | "completed"
  | "failed"
  | "no_prediction_id"
  | "timed_out";

export interface ReconcileResult {
  outcome: ReconcileOutcome;
}

// Core reconciliation logic for a single processing music row. Idempotent:
// if audio_key already exists the upload step is skipped. Exported so both
// the polling route and the internal cron route can reuse it.
export async function reconcileMusicRow(
  music: Music,
  deps: ReconcileDeps,
): Promise<ReconcileResult> {
  const reference = resolveGenerationReference(music);
  const provider = reference && (deps.getProvider ?? getMusicGenerationProvider)(reference.provider);
  if (!reference || !provider) {
    await deps.refundAndMarkFailed(music.id, music.user_id, "missing prediction id");
    return { outcome: "no_prediction_id" };
  }

  const ageMs = Date.now() - new Date(music.created_at).getTime();
  const generation = await provider.getStatus(reference.jobId);

  if (generation.state === "failed") {
    await deps.refundAndMarkFailed(music.id, music.user_id, generation.error);
    return { outcome: "failed" };
  }

  if (generation.state !== "succeeded") {
    if (ageMs > PROCESSING_TIMEOUT_MS) {
      await deps.refundAndMarkFailed(music.id, music.user_id, "generation timeout");
      return { outcome: "timed_out" };
    }
    return { outcome: "pending" };
  }

  // Prediction succeeded — persist audio if not already done.
  // audio_key alone is sufficient to detect a previous upload; audio_url can
  // be reconstructed via getAudioUrl if the DB update didn't finish last time.
  if (music.audio_key) {
    const audioUrl = music.audio_url ?? deps.getAudioUrl(music.audio_key);
    await deps.markCompleted(music.id, audioUrl, music.audio_key);
    return { outcome: "completed" };
  }

  const audioUrl = generation.audioUrl;

  const bytes = await deps.downloadAudio(audioUrl);
  const uploadKey = `${music.user_id}/${music.id}.mp3`;
  const uploaded = await deps.uploadAudio(uploadKey, bytes);
  await deps.markCompleted(music.id, uploaded.url, uploaded.key);
  return { outcome: "completed" };
}
