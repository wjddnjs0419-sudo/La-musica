import type { createServerClient } from "@insforge/sdk/ssr";
import { MUSICS_BUCKET, type Music } from "../music";
import { downloadThumbnailOutput } from "./generateThumbnail";

type ServerClient = ReturnType<typeof createServerClient>;
type ThumbnailPrediction = {
  status: string;
  output?: unknown;
  error?: unknown;
};

// Persist the result of an already-created Replicate prediction. Keeping this
// bounded to download + storage + DB work means a slow image model never holds
// a serverless invocation open.
export async function reconcileThumbnailPrediction(
  client: ServerClient,
  userId: string,
  music: Music,
  prediction: ThumbnailPrediction,
): Promise<Music> {
  if (prediction.status !== "succeeded") {
    if (prediction.status === "failed" || prediction.status === "canceled") {
      return markThumbnailFailed(
        client,
        music,
        prediction.error ? String(prediction.error) : "thumbnail_prediction_failed",
      );
    }
    return music;
  }

  try {
    const blob = await downloadThumbnailOutput(prediction.output);
    const file = new File([blob], `${music.id}.webp`, { type: "image/webp" });
    const uploadKey = `${userId}/${music.id}-thumbnail-${Date.now()}.webp`;
    const { data: uploaded, error: uploadError } = await client.storage
      .from(MUSICS_BUCKET)
      .upload(uploadKey, file);

    if (uploadError || !uploaded) {
      throw uploadError ?? new Error("thumbnail_upload_failed");
    }

    const { data: updated, error: updateError } = await client.database
      .from("musics")
      .update({
        thumbnail_url: uploaded.url,
        thumbnail_key: uploaded.key,
        thumbnail_status: "succeeded",
        metadata: withoutThumbnailError(music.metadata),
      })
      .eq("id", music.id)
      .select();

    if (updateError || !updated?.[0]) {
      throw updateError ?? new Error("thumbnail_update_failed");
    }

    return updated[0] as Music;
  } catch (err) {
    return markThumbnailFailed(client, music, errorMessage(err));
  }
}

async function markThumbnailFailed(
  client: ServerClient,
  music: Music,
  reason: string,
): Promise<Music> {
  const { data: updated, error } = await client.database
    .from("musics")
    .update({
      thumbnail_url: null,
      thumbnail_key: null,
      thumbnail_status: "failed",
      metadata: { ...music.metadata, thumbnail_error: reason },
    })
    .eq("id", music.id)
    .select();

  if (error) {
    console.error("thumbnail failure status update failed", {
      musicId: music.id,
      error,
    });
    return {
      ...music,
      thumbnail_status: "failed",
      metadata: { ...music.metadata, thumbnail_error: reason },
    };
  }

  return (
    (updated?.[0] as Music) ?? {
      ...music,
      thumbnail_status: "failed",
      metadata: { ...music.metadata, thumbnail_error: reason },
    }
  );
}

function withoutThumbnailError(metadata: Record<string, unknown>) {
  const nextMetadata = { ...metadata };
  delete nextMetadata.thumbnail_error;
  return nextMetadata;
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}
