import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerClient,
  refreshAuth,
  setAuthCookies,
} from "@insforge/sdk/ssr";
import Replicate from "replicate";

import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import {
  ACE_STEP_MODEL,
  ACE_STEP_VERSION,
  buildAceStepInput,
  type Music,
} from "@/lib/music";
import { compileMusicPrompt } from "@/lib/music-prompt";
import { translateToEnglish } from "@/lib/translatePrompt";
import { refineStylePrompt } from "@/lib/refineStylePrompt";
import { buildFallbackMusicTitle } from "@/lib/musicTitle";
import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

type AuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

// Kick off an async fishaudio/ace-step-1.5 prediction and persist a
// `processing` row. The client polls GET /api/music/[id] until it resolves.
export async function POST(request: NextRequest) {
  let body: {
    prompt?: unknown;
    lyrics?: unknown;
    instrumental?: unknown;
    genre?: unknown;
    moods?: unknown;
    useCase?: unknown;
    vocalMode?: unknown;
    language?: unknown;
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
  const instrumental = body.instrumental === true;

  const genre =
    typeof body.genre === "string" ? (body.genre as MusicGenre) : undefined;
  const moods = Array.isArray(body.moods)
    ? (body.moods.filter((m): m is MusicMood => typeof m === "string").slice(0, 12))
    : undefined;
  const useCase =
    typeof body.useCase === "string"
      ? (body.useCase as MusicUseCase)
      : undefined;
  const vocalMode =
    typeof body.vocalMode === "string"
      ? (body.vocalMode as VocalMode)
      : undefined;
  const language =
    typeof body.language === "string" ? body.language : undefined;

  const auth = await getAuthenticatedClient(request);
  const { client, user, refreshedTokens } = auth;
  if (!user) {
    return jsonWithAuthCookies(
      { error: "unauthorized" },
      { status: 401 },
      refreshedTokens,
    );
  }

  const admin = createInsforgeAdminClient();
  const availableCredit = await readRemainingCredit(admin, user.id);
  if (availableCredit <= 0) {
    return jsonWithAuthCookies(
      { error: "insufficient_credit", remaining_credit: availableCredit },
      { status: 402 },
      refreshedTokens,
    );
  }

  // Translate the user's free-text description to English before compiling so
  // non-English users still get the engineered English prompt quality. The
  // structured option presets are already English; this covers the free text.
  // Falls back to the original text on any failure (never blocks generation).
  const userDescriptionRaw = prompt;
  const userDescription = await translateToEnglish(userDescriptionRaw);

  // An explicit client `vocalMode` supersedes the legacy `instrumental` boolean;
  // the persisted `instrumental` flag is then derived from the compiler result
  // (compiled.instrumental), not from this raw input.
  const compiled = compileMusicPrompt({
    userDescription,
    genre,
    moods,
    useCase,
    vocalMode: vocalMode ?? (instrumental ? "instrumental" : undefined),
    language,
    lyrics: lyrics || undefined,
  });

  // ACE-Step has no server-side lyric improvisation (unlike MiniMax): a vocal
  // mode with no lyrics would silently render as an instrumental track
  // (empty `lyrics` defaults to "[Instrumental]" — see buildAceStepInput).
  // Reject before spending a refine call, a DB round-trip, or a credit.
  // `compiled.instrumental` is the fully-resolved flag (covers explicit
  // `vocalMode`, the legacy `instrumental` boolean, and genre-based
  // auto-resolution in `resolveVocalMode`), so this check can't miss a case
  // the compiler itself would have treated as vocal.
  if (!compiled.instrumental && !lyrics) {
    return jsonWithAuthCookies(
      { error: "lyrics_required" },
      { status: 400 },
      refreshedTokens,
    );
  }

  // Titles are never Gemini-generated — always derived locally (lyrics hook
  // line, else genre/mood) to keep song generation down to translate+refine
  // on the shared free-tier Gemini budget.
  const generatedTitle = buildFallbackMusicTitle({
    lyrics,
    instrumental: compiled.instrumental,
    genre,
    moods,
  });

  // Refine the compiled "comma soup" into a coherent ACE-Step style prompt via
  // a separate Gemini pass (presets stay as guardrails). Falls back to the
  // compiled prompt on any failure, so this never blocks generation.
  const refinedPrompt = await refineStylePrompt(compiled.prompt, compiled.instrumental);

  const initialMetadata = {
    instrumental: compiled.instrumental,
    ...(lyrics ? { lyrics } : {}),
    ...(userDescription !== userDescriptionRaw
      ? { user_description_original: userDescriptionRaw }
      : {}),
    ...compiled.metadata,
    // Persist both prompts: the pre-refine template output and the prompt that
    // was actually sent to ACE-Step (overrides compiled.metadata.final_music_prompt).
    compiled_music_prompt: compiled.prompt,
    final_music_prompt: refinedPrompt,
    ...(compiled.lyrics ? { lyrics_payload: compiled.lyrics } : {}),
  };

  const { data: reserved, error: reserveError } = await admin.database.rpc(
    "create_music_with_credit",
    {
      p_user_id: user.id,
      p_prompt: prompt,
      p_title: generatedTitle,
      p_model: ACE_STEP_MODEL,
      p_metadata: initialMetadata,
    },
  );

  if (reserveError || !reserved) {
    const message = reserveError?.message ?? "";
    if (message.includes("insufficient_credit")) {
      const remainingCredit = await readRemainingCredit(admin, user.id);
      return jsonWithAuthCookies(
        { error: "insufficient_credit", remaining_credit: remainingCredit },
        { status: 402 },
        refreshedTokens,
      );
    }
    console.error("music credit reservation failed", reserveError);
    return jsonWithAuthCookies(
      { error: "db_insert_failed" },
      { status: 500 },
      refreshedTokens,
    );
  }

  const music = reserved as Music;
  const replicate = new Replicate(); // reads REPLICATE_API_TOKEN

  let predictionId: string;
  try {
    const prediction = await replicate.predictions.create({
      version: ACE_STEP_VERSION,
      input: buildAceStepInput({
        prompt: refinedPrompt,
        lyrics: compiled.lyrics,
        instrumental: compiled.instrumental,
      }),
    });
    predictionId = prediction.id;
  } catch (err) {
    console.error("replicate create failed", err);
    await admin.database.rpc("refund_failed_music_credit", {
      p_user_id: user.id,
      p_music_id: music.id,
      p_message: "generation failed",
    });
    return jsonWithAuthCookies(
      { error: "generation_failed" },
      { status: 502 },
      refreshedTokens,
    );
  }

  const { data: rows, error } = await client.database
    .from("musics")
    .update({
      status: "processing",
      metadata: {
        ...music.metadata,
        prediction_id: predictionId,
      },
    })
    .eq("id", music.id)
    .select();

  if (error || !rows?.[0]) {
    console.error("music prediction attach failed", error);
    return jsonWithAuthCookies(
      { error: "db_update_failed" },
      { status: 500 },
      refreshedTokens,
    );
  }

  const remainingCredit = await readRemainingCredit(admin, user.id);
  return jsonWithAuthCookies(
    {
      music: rows[0],
      remaining_credit: remainingCredit,
    },
    undefined,
    refreshedTokens,
  );
}

async function getAuthenticatedClient(request: NextRequest) {
  const cookieStore = await cookies();
  let client = createServerClient({ cookies: cookieStore });
  let { data: userData, error: authError } = await client.auth.getCurrentUser();

  if (userData?.user) {
    return { client, user: userData.user, refreshedTokens: null };
  }

  const refreshResult = await refreshAuth({ request, cookies: cookieStore });
  if (refreshResult.accessToken) {
    client = createServerClient({ accessToken: refreshResult.accessToken });
    const retry = await client.auth.getCurrentUser();
    userData = retry.data;
    authError = retry.error;
  }

  if (!userData?.user) {
    console.error("generate auth check failed", {
      hasAccessTokenCookie: Boolean(
        cookieStore.get("insforge_access_token")?.value,
      ),
      hasRefreshTokenCookie: Boolean(
        cookieStore.get("insforge_refresh_token")?.value,
      ),
      refreshed: Boolean(refreshResult.accessToken),
      authError,
      refreshError: refreshResult.error,
    });
  }

  return {
    client,
    user: userData?.user ?? null,
    refreshedTokens: refreshResult.accessToken
      ? {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
        }
      : null,
  };
}

function jsonWithAuthCookies(
  body: unknown,
  init?: ResponseInit,
  tokens?: AuthTokens | null,
) {
  const response = NextResponse.json(body, init);
  if (tokens) {
    setAuthCookies(response.cookies, tokens);
  }
  return response;
}

async function readRemainingCredit(
  admin: ReturnType<typeof createInsforgeAdminClient>,
  userId: string,
) {
  const { data } = await admin.database
    .from("user_credits")
    .select("credit")
    .eq("user_id", userId)
    .maybeSingle();

  const credit = (data as { credit?: unknown } | null)?.credit;
  return typeof credit === "number" ? credit : 0;
}
