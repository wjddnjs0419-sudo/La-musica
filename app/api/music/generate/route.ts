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
  MINIMAX_MODEL,
  buildMinimaxInput,
  deriveTitle,
  type Music,
} from "@/lib/music";
import { compileMusicPrompt } from "@/lib/music-prompt";
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

// Kick off an async minimax/music-2.6 prediction and persist a `processing`
// row. The client polls GET /api/music/[id] until it resolves.
export async function POST(request: NextRequest) {
  let body: {
    prompt?: unknown;
    lyrics?: unknown;
    style?: unknown;
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
  const style = typeof body.style === "string" ? body.style.trim() : "";
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

  // An explicit client `vocalMode` supersedes the legacy `instrumental` boolean;
  // the persisted `instrumental` flag is then derived from the compiler result
  // (compiled.instrumental), not from this raw input.
  const compiled = compileMusicPrompt({
    userDescription: [prompt, style].filter(Boolean).join(". "),
    genre,
    moods,
    useCase,
    vocalMode: vocalMode ?? (instrumental ? "instrumental" : undefined),
    language,
    lyrics: lyrics || undefined,
  });

  const auth = await getAuthenticatedClient(request);
  const { client, user, refreshedTokens } = auth;
  if (!user) {
    return jsonWithAuthCookies(
      { error: "unauthorized" },
      { status: 401 },
      refreshedTokens,
    );
  }

  const initialMetadata = {
    instrumental: compiled.instrumental,
    ...(lyrics ? { lyrics } : {}),
    ...(style ? { style } : {}),
    ...compiled.metadata,
    ...(compiled.lyrics ? { lyrics_payload: compiled.lyrics } : {}),
  };

  const admin = createInsforgeAdminClient();
  const { data: reserved, error: reserveError } = await admin.database.rpc(
    "create_music_with_credit",
    {
      p_user_id: user.id,
      p_prompt: prompt,
      p_title: deriveTitle(prompt),
      p_model: MINIMAX_MODEL,
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
      model: MINIMAX_MODEL,
      input: buildMinimaxInput({
        prompt: compiled.prompt,
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
