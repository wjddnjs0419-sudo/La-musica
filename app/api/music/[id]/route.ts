import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import Replicate from "replicate";
import { reconcileThumbnailPrediction } from "@/lib/image/ensureThumbnail";
import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import { MUSICS_BUCKET, type Music } from "@/lib/music";
import { reconcileMusicRow } from "@/lib/reconcile-music";
import { getMusicGenerationProvider } from "@/lib/music-generation/provider";

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

  const replicate = new Replicate();
  const thumbnailResolution = resolveThumbnailPrediction(
    client,
    user.id,
    music,
    replicate,
  );

  // A cover prediction is independent from the audio prediction. Resolve it
  // on every poll so the workspace can show the cover as soon as it is ready,
  // including before the song itself has finished.
  if (music.status === "completed") {
    return NextResponse.json({ music: await thumbnailResolution });
  }

  if (music.status === "failed") {
    return NextResponse.json({ music: await thumbnailResolution });
  }

  let resolvedMusic = music;
  try {
    await reconcileMusicRow(music, {
      getProvider: getMusicGenerationProvider,
      downloadAudio: async (audioUrl) => {
        const res = await fetch(audioUrl);
        if (!res.ok) throw new Error(`download ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      },
      uploadAudio: async (key, bytes) => {
        const file = new File([Buffer.from(bytes)], `${id}.mp3`, { type: "audio/mpeg" });
        const { data: uploaded, error: uploadError } = await client.storage.from(MUSICS_BUCKET).upload(key, file);
        if (uploadError || !uploaded) throw uploadError ?? new Error("upload failed");
        return { url: uploaded.url, key: uploaded.key };
      },
      getAudioUrl: (key) => `${process.env.INSFORGE_URL ?? process.env.NEXT_PUBLIC_INSFORGE_URL}/storage/v1/object/public/${MUSICS_BUCKET}/${key}`,
      markCompleted: async (musicId, audioUrl, audioKey) => {
        const { data: updated, error: updateError } = await client.database.from("musics").update({ status: "completed", audio_url: audioUrl, audio_key: audioKey }).eq("id", musicId).eq("status", "processing").select();
        if (updateError || !updated?.[0]) throw updateError ?? new Error("music finalize failed");
        resolvedMusic = updated[0] as Music;
      },
      refundAndMarkFailed: async (_musicId, _userId, reason) => {
        resolvedMusic = (await refundAndMarkFailed(user.id, id, reason)) ?? music;
      },
    });
  } catch (err) {
    console.error("music reconcile failed", err);
    return NextResponse.json({ music: await thumbnailResolution }); // transient; let client retry
  }

  return NextResponse.json({ music: withThumbnailResult(resolvedMusic, await thumbnailResolution) });
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

async function resolveThumbnailPrediction(
  client: ReturnType<typeof createServerClient>,
  userId: string,
  music: Music,
  replicate: Replicate,
): Promise<Music> {
  const predictionId = music.metadata?.thumbnail_prediction_id;
  if (music.thumbnail_status !== "pending" || typeof predictionId !== "string") {
    return music;
  }

  try {
    const prediction = await replicate.predictions.get(predictionId);
    return reconcileThumbnailPrediction(client, userId, music, prediction);
  } catch (error) {
    // A transient Replicate read failure must not turn a healthy in-progress
    // cover into a permanent failure. The next workspace poll retries it.
    console.error("thumbnail prediction get failed", { musicId: music.id, error });
    return music;
  }
}

function withThumbnailResult(music: Music, thumbnailMusic: Music): Music {
  return {
    ...music,
    thumbnail_url: thumbnailMusic.thumbnail_url,
    thumbnail_key: thumbnailMusic.thumbnail_key,
    thumbnail_prompt: thumbnailMusic.thumbnail_prompt,
    thumbnail_status: thumbnailMusic.thumbnail_status,
    metadata: thumbnailMusic.metadata,
  };
}
