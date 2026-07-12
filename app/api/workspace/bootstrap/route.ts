import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

import type { Music } from "@/lib/music";

const MUSIC_COLUMNS = [
  "id",
  "user_id",
  "title",
  "prompt",
  "status",
  "audio_url",
  "audio_key",
  "cover_url",
  "cover_key",
  "thumbnail_url",
  "thumbnail_key",
  "thumbnail_prompt",
  "thumbnail_status",
  "duration_seconds",
  "model",
  "is_public",
  "error_message",
  "metadata",
  "created_at",
  "updated_at",
].join(", ");

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data: userData } = await client.auth.getCurrentUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [tracksResult, creditResult] = await Promise.all([
    client.database
      .from("musics")
      .select(MUSIC_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    client.database
      .from("user_credits")
      .select("credit")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (tracksResult.error) {
    console.error("workspace bootstrap music list failed", tracksResult.error);
    return NextResponse.json(
      { error: "tracks_read_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (creditResult.error) {
    console.error("workspace bootstrap credit read failed", creditResult.error);
    return NextResponse.json(
      { error: "credit_read_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tracks = (tracksResult.data ?? []) as unknown as Music[];
  const creditRow = creditResult.data as { credit?: unknown } | null;
  const credit = typeof creditRow?.credit === "number" ? creditRow.credit : 0;
  const profile = user.profile as
    | { name?: unknown; avatar_url?: unknown }
    | null
    | undefined;

  return NextResponse.json(
    {
      user: {
        name: typeof profile?.name === "string" ? profile.name : null,
        email: user.email,
        avatarUrl:
          typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
      },
      tracks,
      credit,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
