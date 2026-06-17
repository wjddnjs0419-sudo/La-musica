import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, refreshAuth } from "@insforge/sdk/ssr";

import {
  generateLyrics,
  type LyricsChatMessage,
  type LyricsContext,
} from "@/lib/lyrics-assistant/prompt";

// AI Lyrics Assistant chat endpoint.
// - Accepts { messages, context, currentLyrics }.
// - Returns structured { title, lyrics, hook, notes } from Gemini.
// - Requires an authenticated user (to avoid anonymous abuse of the Gemini
//   key) but NEVER deducts credits and never touches music generation.

// Lightweight auth: reuse the cookie session, falling back to a token refresh,
// mirroring the music generate route. Returns the user id or null.
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    let client = createServerClient({ cookies: cookieStore });
    let { data } = await client.auth.getCurrentUser();
    if (data?.user) return data.user.id;

    const refreshResult = await refreshAuth({ request, cookies: cookieStore });
    if (refreshResult.accessToken) {
      client = createServerClient({ accessToken: refreshResult.accessToken });
      ({ data } = await client.auth.getCurrentUser());
      if (data?.user) return data.user.id;
    }
    return null;
  } catch (err) {
    console.error("lyrics auth check threw", err);
    return null;
  }
}

function sanitizeMessages(input: unknown): LyricsChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: unknown; content: unknown } =>
        typeof m === "object" && m !== null,
    )
    .map<LyricsChatMessage>((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content : "",
    }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-20); // cap history sent to the model
}

function sanitizeContext(input: unknown): LyricsContext | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const c = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    prompt: str(c.prompt),
    genre: str(c.genre),
    moods: Array.isArray(c.moods)
      ? c.moods.filter((m): m is string => typeof m === "string").slice(0, 12)
      : undefined,
    vocalMode: str(c.vocalMode),
    language: str(c.language),
    useCase: str(c.useCase),
  };
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { messages?: unknown; context?: unknown; currentLyrics?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = sanitizeMessages(body.messages);
  const context = sanitizeContext(body.context);
  const currentLyrics =
    typeof body.currentLyrics === "string" ? body.currentLyrics : undefined;

  // Need at least one user instruction OR some context to ground a first draft.
  const hasUserTurn = messages.some((m) => m.role === "user");
  const hasContext =
    Boolean(context?.prompt?.trim()) ||
    Boolean(context?.genre?.trim()) ||
    Boolean(context?.moods?.length) ||
    Boolean(currentLyrics?.trim());
  if (!hasUserTurn && !hasContext) {
    return NextResponse.json({ error: "nothing_to_write" }, { status: 400 });
  }

  try {
    const result = await generateLyrics(messages, context, currentLyrics);
    return NextResponse.json(result);
  } catch (err) {
    const code = err instanceof Error ? err.message : "gemini_failed";
    if (code === "gemini_unconfigured") {
      return NextResponse.json({ error: "gemini_unconfigured" }, { status: 503 });
    }
    if (code === "gemini_bad_output") {
      return NextResponse.json({ error: "gemini_bad_output" }, { status: 502 });
    }
    console.error("lyrics chat failed", err);
    return NextResponse.json({ error: "gemini_failed" }, { status: 502 });
  }
}
