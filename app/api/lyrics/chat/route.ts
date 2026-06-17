import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, refreshAuth, setAuthCookies } from "@insforge/sdk/ssr";

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

type AuthTokens = { accessToken: string; refreshToken?: string | null };

// Lightweight auth: reuse the cookie session, falling back to a token refresh,
// mirroring the music generate route. Returns the user id plus any refreshed
// tokens — the caller MUST persist them on the response so the session does not
// silently die (the previous version refreshed in-memory only and let the
// session expire, surfacing as "Please sign in to use AI lyrics").
async function getUserId(
  request: NextRequest,
): Promise<{ userId: string | null; refreshedTokens: AuthTokens | null }> {
  try {
    const cookieStore = await cookies();
    let client = createServerClient({ cookies: cookieStore });
    let { data } = await client.auth.getCurrentUser();
    if (data?.user) return { userId: data.user.id, refreshedTokens: null };

    const refreshResult = await refreshAuth({ request, cookies: cookieStore });
    if (refreshResult.accessToken) {
      client = createServerClient({ accessToken: refreshResult.accessToken });
      ({ data } = await client.auth.getCurrentUser());
      const refreshedTokens: AuthTokens = {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
      };
      if (data?.user) return { userId: data.user.id, refreshedTokens };
    }
    return { userId: null, refreshedTokens: null };
  } catch (err) {
    console.error("lyrics auth check threw", err);
    return { userId: null, refreshedTokens: null };
  }
}

// Attach refreshed auth cookies (if any) to a JSON response so a token refresh
// during this request keeps the browser session alive for the next one.
function jsonWithAuthCookies(
  body: unknown,
  init: ResponseInit | undefined,
  tokens: AuthTokens | null,
) {
  const response = NextResponse.json(body, init);
  if (tokens) setAuthCookies(response.cookies, tokens);
  return response;
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
  const { userId, refreshedTokens } = await getUserId(request);
  if (!userId) {
    return jsonWithAuthCookies({ error: "unauthorized" }, { status: 401 }, refreshedTokens);
  }

  let body: { messages?: unknown; context?: unknown; currentLyrics?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonWithAuthCookies({ error: "invalid_json" }, { status: 400 }, refreshedTokens);
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
    return jsonWithAuthCookies({ error: "nothing_to_write" }, { status: 400 }, refreshedTokens);
  }

  try {
    const result = await generateLyrics(messages, context, currentLyrics);
    return jsonWithAuthCookies(result, undefined, refreshedTokens);
  } catch (err) {
    const code = err instanceof Error ? err.message : "gemini_failed";
    if (code === "gemini_unconfigured") {
      return jsonWithAuthCookies({ error: "gemini_unconfigured" }, { status: 503 }, refreshedTokens);
    }
    if (code === "gemini_bad_output") {
      return jsonWithAuthCookies({ error: "gemini_bad_output" }, { status: 502 }, refreshedTokens);
    }
    console.error("lyrics chat failed", err);
    return jsonWithAuthCookies({ error: "gemini_failed" }, { status: 502 }, refreshedTokens);
  }
}
