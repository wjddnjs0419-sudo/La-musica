import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import Replicate from "replicate";
import {
  MUSICGEN_MODEL,
  MUSICGEN_VERSION,
  buildMusicgenInput,
  deriveTitle,
} from "@/lib/music";

// Kick off an async musicgen prediction and persist a `processing` row.
// The client polls GET /api/music/[id] until it resolves.
export async function POST(request: Request) {
  let body: { prompt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  const client = createServerClient({ cookies: await cookies() });
  const { data: userData } = await client.auth.getCurrentUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const replicate = new Replicate(); // reads REPLICATE_API_TOKEN

  let predictionId: string;
  try {
    const prediction = await replicate.predictions.create({
      version: MUSICGEN_VERSION,
      input: buildMusicgenInput(prompt),
    });
    predictionId = prediction.id;
  } catch (err) {
    console.error("replicate create failed", err);
    return NextResponse.json({ error: "generation_failed" }, { status: 502 });
  }

  const { data: rows, error } = await client.database
    .from("musics")
    .insert([
      {
        user_id: user.id,
        prompt,
        title: deriveTitle(prompt),
        status: "processing",
        model: MUSICGEN_MODEL,
        metadata: { prediction_id: predictionId },
      },
    ])
    .select();

  if (error || !rows?.[0]) {
    console.error("music insert failed", error);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ music: rows[0] });
}
