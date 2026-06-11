import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import Replicate from "replicate";
import { MUSICS_BUCKET, type Music } from "@/lib/music";

// Poll endpoint: resolves a `processing` row by checking the Replicate
// prediction, copying the finished mp3 into Storage, and finalizing the row.
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

  // Terminal states need no further work.
  if (music.status === "completed" || music.status === "failed") {
    return NextResponse.json({ music });
  }

  const predictionId = music.metadata?.prediction_id as string | undefined;
  if (!predictionId) {
    const failed = await markFailed(client, id, "missing prediction id");
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
    const failed = await markFailed(
      client,
      id,
      prediction.error ? String(prediction.error) : "generation failed",
    );
    return NextResponse.json({ music: failed ?? music });
  }

  if (prediction.status !== "succeeded") {
    return NextResponse.json({ music }); // still starting/processing
  }

  // Succeeded: minimax returns a single mp3 URL (string or 1-item array).
  const audioUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : (prediction.output as string | undefined);

  if (!audioUrl) {
    const failed = await markFailed(client, id, "empty output");
    return NextResponse.json({ music: failed ?? music });
  }

  // Copy the mp3 into our Storage bucket so it survives Replicate's TTL.
  let key: string;
  let url: string;
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
    const failed = await markFailed(client, id, "could not store audio");
    return NextResponse.json({ music: failed ?? music });
  }

  const { data: updated, error: updateError } = await client.database
    .from("musics")
    .update({ status: "completed", audio_url: url, audio_key: key })
    .eq("id", id)
    .select();

  if (updateError || !updated?.[0]) {
    console.error("music finalize failed", updateError);
    return NextResponse.json({ music }); // audio is stored; client can retry
  }

  return NextResponse.json({ music: updated[0] });
}

async function markFailed(
  client: ReturnType<typeof createServerClient>,
  id: string,
  message: string,
): Promise<Music | null> {
  const { data } = await client.database
    .from("musics")
    .update({ status: "failed", error_message: message })
    .eq("id", id)
    .select();
  return (data?.[0] as Music) ?? null;
}
