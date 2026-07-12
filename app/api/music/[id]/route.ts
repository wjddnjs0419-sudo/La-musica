import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import Replicate from "replicate";
import { generateThumbnail } from "@/lib/image/generateThumbnail";
import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import { MUSICS_BUCKET, type Music } from "@/lib/music";
import { buildInitialLyricsSyncMetadata } from "@/lib/lyrics/sync";
import { ensureLyricsSyncStarted } from "@/lib/lyrics/ensureLyricsSync";
import { formatGenreLabel, formatMoodLabel } from "@/lib/musicTitle";
import { buildThumbnailPrompt } from "@/lib/prompts/buildThumbnailPrompt";

// Gemini audio upload (~20s timeout) + alignment (~60s timeout) can run
// inside after() after this route's response is sent; give the function
// enough budget to actually finish instead of being frozen mid-flight.
export const maxDuration = 90;

// Poll endpoint: resolves a `processing` row by checking the Replicate
// prediction, copying the finished mp3 into Storage, and finalizing the row.
// Uses the user-scoped client (not admin) so storage uploads are attributed
// to the authenticated user — this is intentionally separate from the admin
// client used in the reconcile route (app/api/internal/reconcile-music).
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/music/[id]">,
) {
  const { id } = await ctx.params;

  const client = createServerClient({ cookies: await cookies() });
  const { data: userData } = await client.auth.getCurrentUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error } = await client.database
    .from("musics")
    .select()
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_read_failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const music = row as Music;

  // Terminal states need no further music-generation work. Thumbnail generation
  // runs in the background (started when music first completes) — the client
  // shows a placeholder while thumbnail_status is "pending" and polls until
  // thumbnail_status becomes "succeeded" or "failed".
  if (music.status === "completed") {
    const ensured = await ensureLyricsSyncStarted(createInsforgeAdminClient(), music);
    return NextResponse.json({ music: ensured });
  }

  if (music.status === "failed") {
    return NextResponse.json({ music });
  }

  const predictionId = music.metadata?.prediction_id as string | undefined;
  if (!predictionId) {
    const failed = await refundAndMarkFailed(user.id, id, "missing prediction id");
    return NextResponse.json({ music: failed ?? music });
  }

  const replicate = new Replicate();
  let prediction;
  try {
    prediction = await replicate.predictions.get(predictionId);
  } catch (err) {
    console.error("replicate get failed", err);
    return NextResponse.json({ music }); // transient; let client retry
  }

  if (prediction.status === "failed" || prediction.status === "canceled") {
    const failed = await refundAndMarkFailed(
      user.id,
      id,
      prediction.error ? String(prediction.error) : "generation failed",
    );
    return NextResponse.json({ music: failed ?? music });
  }

  if (prediction.status !== "succeeded") {
    return NextResponse.json({ music }); // still starting/processing
  }

  // Succeeded: extract audio URL from prediction output.
  const audioUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : (prediction.output as string | undefined);

  if (!audioUrl) {
    const failed = await refundAndMarkFailed(user.id, id, "empty output");
    return NextResponse.json({ music: failed ?? music });
  }

  // Idempotency: if a previous poll already uploaded the audio (audio_key set)
  // but the DB update to "completed" failed, skip re-upload and go straight to
  // the DB update to avoid a duplicate storage object.
  let key: string;
  let url: string;
  if (music.audio_key && music.audio_url) {
    key = music.audio_key;
    url = music.audio_url;
  } else {
    // Copy the mp3 into our Storage bucket so it survives Replicate's TTL.
    try {
      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const file = new File([bytes], `${id}.mp3`, { type: "audio/mpeg" });

      const uploadKey = `${user.id}/${id}.mp3`;
      const { data: uploaded, error: uploadError } = await client.storage
        .from(MUSICS_BUCKET)
        .upload(uploadKey, file);

      if (uploadError || !uploaded) throw uploadError ?? new Error("upload failed");
      key = uploaded.key;
      url = uploaded.url;
    } catch (err) {
      console.error("audio persist failed", err);
      const failed = await refundAndMarkFailed(user.id, id, "could not store audio");
      return NextResponse.json({ music: failed ?? music });
    }
  }

  const thumbnailPrompt = buildPromptForMusic(music);
  const { data: updated, error: updateError } = await client.database
    .from("musics")
    .update({
      status: "completed",
      audio_url: url,
      audio_key: key,
      thumbnail_prompt: thumbnailPrompt,
      thumbnail_status: "pending",
      metadata: buildInitialLyricsSyncMetadata(music.metadata),
    })
    .eq("id", id)
    .eq("status", "processing") // guard against double-write (parity with reconcile-music)
    .select();

  if (updateError || !updated?.[0]) {
    console.error("music finalize failed", updateError);
    return NextResponse.json({ music }); // audio is stored; client can retry
  }

  // Kick off thumbnail generation in the background — do not await it so the
  // client receives the completed music immediately without waiting for the
  // Replicate image model. thumbnail_status starts as "pending" and the next
  // poll will observe the updated value.
  generateAndPersistThumbnail(client, user.id, updated[0] as Music, thumbnailPrompt).catch(
    (err) => console.error("bg thumbnail failed", { musicId: id, err }),
  );

  const ensured = await ensureLyricsSyncStarted(createInsforgeAdminClient(), updated[0] as Music);
  return NextResponse.json({ music: ensured });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/music/[id]">,
) {
  const { id } = await ctx.params;
  let body: { title?: unknown; duration_seconds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const updates: Partial<Pick<Music, "title" | "duration_seconds">> = {};

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title_required" }, { status: 400 });
    }
    if (title.length > 120) {
      return NextResponse.json({ error: "title_too_long" }, { status: 400 });
    }
    updates.title = title;
  }

  if ("duration_seconds" in body) {
    const durationSeconds = Number(body.duration_seconds);
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      durationSeconds > 60 * 60
    ) {
      return NextResponse.json(
        { error: "duration_seconds_invalid" },
        { status: 400 },
      );
    }
    updates.duration_seconds = Math.round(durationSeconds);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "empty_update" }, { status: 400 });
  }

  const client = createServerClient({ cookies: await cookies() });
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: updated, error } = await client.database
    .from("musics")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) {
    console.error("music rename failed", error);
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }
  if (!updated?.[0]) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ music: updated[0] });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/music/[id]">,
) {
  const { id } = await ctx.params;

  const client = createServerClient({ cookies: await cookies() });
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: row, error: readError } = await client.database
    .from("musics")
    .select("id, audio_key, cover_key, thumbnail_key")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    console.error("music delete read failed", readError);
    return NextResponse.json({ error: "db_read_failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { error: deleteError } = await client.database
    .from("musics")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("music delete failed", deleteError);
    return NextResponse.json({ error: "db_delete_failed" }, { status: 500 });
  }

  const keys = row as Pick<Music, "audio_key" | "cover_key" | "thumbnail_key">;
  for (const key of [keys.audio_key, keys.cover_key, keys.thumbnail_key].filter(
    Boolean,
  ) as string[]) {
    const { error } = await client.storage.from(MUSICS_BUCKET).remove(key);
    if (error) {
      console.error("music storage cleanup failed", { key, error });
    }
  }

  return NextResponse.json({ ok: true });
}

async function refundAndMarkFailed(
  userId: string,
  id: string,
  message: string,
): Promise<Music | null> {
  const admin = createInsforgeAdminClient();
  const { data, error } = await admin.database.rpc("refund_failed_music_credit", {
    p_user_id: userId,
    p_music_id: id,
    p_message: message,
  });

  if (error) {
    console.error("music failure refund failed", error);
  }

  const music = data as Music | null;
  const refundStatus = error ? "failed" : "refunded";
  const existingMetadata = music?.metadata ?? {};

  try {
    const { data: updated } = await admin.database
      .from("musics")
      .update({ metadata: { ...existingMetadata, refund_status: refundStatus } })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (updated) return updated as Music;
  } catch (metaErr) {
    console.error("refund_status metadata update failed", metaErr);
  }

  return music ?? null;
}

async function generateAndPersistThumbnail(
  client: ReturnType<typeof createServerClient>,
  userId: string,
  music: Music,
  prompt = music.thumbnail_prompt ?? buildPromptForMusic(music),
): Promise<Music> {
  try {
    const blob = await generateThumbnail(prompt);
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
        thumbnail_prompt: prompt,
        thumbnail_status: "succeeded",
      })
      .eq("id", music.id)
      .select();

    if (updateError || !updated?.[0]) {
      throw updateError ?? new Error("thumbnail_update_failed");
    }

    return updated[0] as Music;
  } catch (err) {
    console.error("thumbnail generation failed", { musicId: music.id, err });
    const { data: updated, error } = await client.database
      .from("musics")
      .update({
        thumbnail_url: null,
        thumbnail_key: null,
        thumbnail_prompt: prompt,
        thumbnail_status: "failed",
      })
      .eq("id", music.id)
      .select();

    if (error) {
      console.error("thumbnail failure status update failed", {
        musicId: music.id,
        error,
      });
      return { ...music, thumbnail_prompt: prompt, thumbnail_status: "failed" };
    }

    return (updated?.[0] as Music) ?? {
      ...music,
      thumbnail_prompt: prompt,
      thumbnail_status: "failed",
    };
  }
}

function buildPromptForMusic(music: Music) {
  const genre = formatGenreLabel(metadataString(music.metadata, "genre"));
  const mood = metadataStringArray(music.metadata, "moods")
    .map(formatMoodLabel)
    .filter(Boolean)
    .join(", ");

  return buildThumbnailPrompt({
    title: music.title,
    genre,
    mood,
    lyrics: metadataString(music.metadata, "lyrics"),
  });
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function metadataStringArray(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
