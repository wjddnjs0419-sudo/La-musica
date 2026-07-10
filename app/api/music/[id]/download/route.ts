import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import NodeID3 from "node-id3";
import type { Music } from "@/lib/music";

function safeFileName(title: string): string {
  return title.replace(/[^a-zA-Z0-9가-힣\s\-_]/g, "").trim() || "track";
}

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/music/[id]/download">,
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

  if (error || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const music = row as Music;
  if (music.user_id !== user.id && !music.is_public) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!music.audio_url) {
    return NextResponse.json({ error: "audio_not_ready" }, { status: 409 });
  }

  const audioRes = await fetch(music.audio_url);
  if (!audioRes.ok) {
    return NextResponse.json({ error: "audio_fetch_failed" }, { status: 502 });
  }
  const audioBytes = Buffer.from(await audioRes.arrayBuffer());

  const tags: NodeID3.Tags = { title: music.title };

  const artUrl = music.cover_url ?? music.thumbnail_url;
  if (artUrl) {
    try {
      const imgRes = await fetch(artUrl);
      if (imgRes.ok) {
        const imgBytes = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        tags.image = {
          mime: contentType.startsWith("image/") ? contentType : "image/jpeg",
          type: { id: 3, name: "front cover" },
          description: "",
          imageBuffer: imgBytes,
        };
      }
    } catch {
      // cover fetch failed — proceed without album art
    }
  }

  const taggedBuf = NodeID3.write(tags, audioBytes);
  if (!taggedBuf) {
    return NextResponse.json({ error: "tagging_failed" }, { status: 500 });
  }
  const tagged = new Uint8Array(taggedBuf);

  const filename = `${safeFileName(music.title)}.mp3`;
  return new Response(tagged, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Length": String(taggedBuf.length),
    },
  });
}
