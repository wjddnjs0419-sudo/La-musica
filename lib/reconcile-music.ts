import type { Music } from "./music";

// How long a row may stay in "processing" before it is declared timed out.
export const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface ReconcileDeps {
  getPrediction(predictionId: string): Promise<{ status: string; output?: unknown; error?: unknown }>;
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
  const predictionId = music.metadata?.prediction_id as string | undefined;

  if (!predictionId) {
    await deps.refundAndMarkFailed(music.id, music.user_id, "missing prediction id");
    return { outcome: "no_prediction_id" };
  }

  const ageMs = Date.now() - new Date(music.created_at).getTime();
  const prediction = await deps.getPrediction(predictionId);

  if (prediction.status === "failed" || prediction.status === "canceled") {
    const reason = prediction.error ? String(prediction.error) : "generation failed";
    await deps.refundAndMarkFailed(music.id, music.user_id, reason);
    return { outcome: "failed" };
  }

  if (prediction.status !== "succeeded") {
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

  const audioUrl = Array.isArray(prediction.output)
    ? (prediction.output[0] as string)
    : (prediction.output as string | undefined);

  if (!audioUrl) {
    await deps.refundAndMarkFailed(music.id, music.user_id, "empty prediction output");
    return { outcome: "failed" };
  }

  const bytes = await deps.downloadAudio(audioUrl);
  const uploadKey = `${music.user_id}/${music.id}.mp3`;
  const uploaded = await deps.uploadAudio(uploadKey, bytes);
  await deps.markCompleted(music.id, uploaded.url, uploaded.key);
  return { outcome: "completed" };
}
