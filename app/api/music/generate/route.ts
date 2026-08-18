import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerClient,
  refreshAuth,
  setAuthCookies,
} from "@insforge/sdk/ssr";
import Replicate from "replicate";

import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import { createThumbnailPrediction } from "@/lib/image/generateThumbnail";
import {
  type Music,
} from "@/lib/music";
import { getActiveMusicGenerationProvider } from "@/lib/music-generation/provider";
import { compileMusicPrompt, buildLyricsPayload } from "@/lib/music-prompt";
import { translateToEnglish } from "@/lib/translatePrompt";
import { buildFallbackMusicTitle } from "@/lib/musicTitle";
import { buildThumbnailPrompt } from "@/lib/prompts/buildThumbnailPrompt";
import { generateAutoLyricsForSong } from "@/lib/lyrics-assistant/generateAutoLyrics";
import { buildCostLogRow } from "@/lib/cost-logging";
import type {
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";
import { resolveReggaetonGenerationInput } from "@/lib/music-prompt/reggaeton-request";

type AuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

// Kick off an asynchronous music-provider job and persist a
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
    style?: unknown;
    scene?: unknown;
    duration?: unknown;
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

  const normalized = resolveReggaetonGenerationInput({ style: body.style, scene: body.scene, language: typeof body.language === "string" ? body.language : undefined, lyrics: typeof body.lyrics === "string" ? body.lyrics : undefined });
  const genre = normalized.genre;
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
  const language = normalized.language;
  const duration =
    typeof body.duration === "number" && body.duration > 0
      ? Math.min(Math.round(body.duration), 300)
      : undefined;

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
  const musicProvider = getActiveMusicGenerationProvider();
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
    style: normalized.style,
    scene: normalized.scene,
    moods,
    useCase,
    vocalMode: vocalMode ?? (instrumental ? "instrumental" : undefined),
    language,
    lyrics: lyrics || undefined,
  });

  // Determine lyrics payload and source.
  // - User supplied lyrics → use as-is, source = "user"
  // - Vocal + no lyrics → auto-generate via Gemini, source = "auto"
  // - Instrumental → no lyrics needed, source = "instrumental"
  let finalLyrics = lyrics;
  const lyricsSource: "user" | "auto" | "instrumental" = compiled.instrumental
    ? "instrumental"
    : lyrics
      ? "user"
      : "auto";

  if (!compiled.instrumental && !lyrics) {
    try {
      finalLyrics = await generateAutoLyricsForSong({
        prompt: userDescription,
        genre,
        moods,
        vocalMode,
        language,
        useCase,
      });
    } catch (err) {
      console.error("auto lyrics generation failed", err);
      return jsonWithAuthCookies(
        { error: "lyrics_generation_failed" },
        { status: 502 },
        refreshedTokens,
      );
    }
  }

  // Titles are never Gemini-generated — always derived locally (lyrics hook
  // line, else genre/mood) to keep song generation down to translate+refine
  // on the shared free-tier Gemini budget.
  const generatedTitle = buildFallbackMusicTitle({
    lyrics: finalLyrics,
    instrumental: compiled.instrumental,
    genre,
    moods,
  });
  const thumbnailPrompt = buildThumbnailPrompt({ title: generatedTitle });

  // For vocal songs, resolve the provider-ready lyrics payload. Both paths run
  // through buildLyricsPayload so section tags are canonical and the payload
  // is capped at MAX_LYRICS_CHARS regardless of source.
  // - user lyrics: compile step already called buildLyricsPayload; use compiled.lyrics
  // - auto lyrics: Gemini output, normalize now via buildLyricsPayload
  // - instrumental: undefined; the provider selects its own instrumental signal
  const aceLyricsPayload = compiled.instrumental
    ? undefined
    : lyricsSource === "user"
      ? compiled.lyrics
      : buildLyricsPayload(
          { userDescription, lyrics: finalLyrics },
          compiled.metadata.vocal_mode,
        );

  const initialMetadata = {
    instrumental: compiled.instrumental,
    // lyrics = effective lyrics used for generation (regardless of source)
    ...(finalLyrics ? { lyrics: finalLyrics } : {}),
    ...(userDescription !== userDescriptionRaw
      ? { user_description_original: userDescriptionRaw }
      : {}),
    ...compiled.metadata,
    // Persist both prompts: the pre-refine template output and the prompt that
    // was actually sent to ACE-Step (overrides compiled.metadata.final_music_prompt).
    compiled_music_prompt: compiled.prompt,
    // Replaced with the refined prompt when prediction IDs are attached below.
    final_music_prompt: compiled.prompt,
    ...(aceLyricsPayload ? { lyrics_payload: aceLyricsPayload } : {}),
    lyrics_source: lyricsSource,
  };

  const { data: reserved, error: reserveError } = await admin.database.rpc(
    "create_music_with_credit",
    {
      p_user_id: user.id,
      p_prompt: prompt,
      p_title: generatedTitle,
      p_model: musicProvider.model,
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

  // The title is already final at this point. Start the cover immediately
  // after the credit reservation, while style refinement continues.
  const thumbnailPredictionPromise = createThumbnailPrediction(
    replicate,
    thumbnailPrompt,
  );

  // The cover prediction began as soon as the credit reservation permitted it.
  // Await only its creation response alongside the audio prediction creation;
  // neither waits for GPU generation to finish.
  const [musicPredictionResult, thumbnailPredictionResult] =
    await Promise.allSettled([
      musicProvider.start({
          prompt: compiled.prompt,
          lyrics: aceLyricsPayload,
          instrumental: compiled.instrumental,
          duration,
      }),
      thumbnailPredictionPromise,
    ]);

  if (musicPredictionResult.status === "rejected") {
    console.error("music prediction create failed", musicPredictionResult.reason);
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

  const predictionId = musicPredictionResult.value.jobId;
  const thumbnailStarted = thumbnailPredictionResult.status === "fulfilled";
  const thumbnailMetadata = thumbnailStarted
    ? { thumbnail_prediction_id: thumbnailPredictionResult.value.id }
    : { thumbnail_error: errorMessage(thumbnailPredictionResult.reason) };

  if (!thumbnailStarted) {
    console.error("thumbnail prediction create was unavailable", thumbnailPredictionResult.reason);
  }

  const { data: rows, error } = await client.database
    .from("musics")
    .update({
      status: "processing",
      thumbnail_prompt: thumbnailPrompt,
      thumbnail_status: thumbnailStarted ? "pending" : "failed",
      metadata: {
        ...music.metadata,
        final_music_prompt: musicPredictionResult.value.effectivePrompt,
        generation: {
          provider: musicPredictionResult.value.provider,
          job_id: predictionId,
          model: musicPredictionResult.value.model,
        },
        ...thumbnailMetadata,
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

  // Fire-and-forget cost log — failure must not block the generation response.
  const costRow = buildCostLogRow({
    userId: user.id,
    musicId: music.id,
    generationJobId: predictionId,
    musicModel: musicPredictionResult.value.model,
    durationSeconds: musicPredictionResult.value.durationSeconds,
    estimatedMusicCostUsd: musicPredictionResult.value.estimatedMusicCostUsd,
    lyricsSource,
    translationUsed: userDescription !== userDescriptionRaw,
    styleRefineUsed: true,
  });
  admin.database
    .from("generation_cost_logs")
    .insert([costRow])
    .then(({ error: logError }) => {
      if (logError) console.error("cost log insert failed", logError);
    });

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

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
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
