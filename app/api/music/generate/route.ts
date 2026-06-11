import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import Replicate from "replicate";
import {
  MINIMAX_MODEL,
  buildMinimaxInput,
  deriveTitle,
} from "@/lib/music";

// Kick off an async minimax/music-2.6 prediction and persist a `processing`
// row. The client polls GET /api/music/[id] until it resolves.
export async function POST(request: Request) {
  let body: {
    prompt?: unknown;
    lyrics?: unknown;
    style?: unknown;
    instrumental?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  const lyrics = typeof body.lyrics === "string" ? body.lyrics.trim() : "";
  const style = typeof body.style === "string" ? body.style.trim() : "";
  const instrumental = body.instrumental === true;

  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data: userData, error: authError } =
    await client.auth.getCurrentUser();
  const user = userData?.user;
  if (!user) {
    // TEMP diagnostic — remove after debugging the 401.
    console.error("generate auth check failed", {
      hasAccessTokenCookie: Boolean(
        cookieStore.get("insforge_access_token")?.value,
      ),
      hasRefreshTokenCookie: Boolean(
        cookieStore.get("insforge_refresh_token")?.value,
      ),
      authError,
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const replicate = new Replicate(); // reads REPLICATE_API_TOKEN

  let predictionId: string;
  try {
    const prediction = await replicate.predictions.create({
      model: MINIMAX_MODEL,
      input: buildMinimaxInput({ prompt, style, lyrics, instrumental }),
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
        model: MINIMAX_MODEL,
        duration_seconds: null,
        metadata: {
          prediction_id: predictionId,
          instrumental,
          ...(lyrics ? { lyrics } : {}),
          ...(style ? { style } : {}),
        },
      },
    ])
    .select();

  if (error || !rows?.[0]) {
    console.error("music insert failed", error);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ music: rows[0] });
}
