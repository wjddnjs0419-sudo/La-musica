// Gemini Flash Lite: free tier / ~$0.000 per call on paid — use $0.0001 as
// conservative placeholder until actual billing data is available.
export const GEMINI_FLASH_LITE_COST_PER_CALL_USD = 0.0001;

export interface CostLogInput {
  userId: string;
  musicId: string;
  generationJobId: string;
  musicModel: string;
  durationSeconds: number;
  estimatedMusicCostUsd: number;
  lyricsSource: "user" | "auto" | "instrumental";
  translationUsed?: boolean;
  styleRefineUsed?: boolean;
}

export interface CostLogRow {
  user_id: string;
  music_id: string;
  prediction_id: string;
  music_model: string;
  duration_seconds: number;
  translation_used: boolean;
  lyrics_generation_used: boolean;
  style_refine_used: boolean;
  estimated_music_cost_usd: number;
  estimated_gemini_cost_usd: number | null;
  estimated_total_cost_usd: number;
}

export function buildCostLogRow(input: CostLogInput): CostLogRow {
  const {
    userId,
    musicId,
    generationJobId,
    musicModel,
    durationSeconds,
    estimatedMusicCostUsd,
    lyricsSource,
    translationUsed = false,
    styleRefineUsed = true, // always run refine by default
  } = input;

  const lyricsGenerationUsed = lyricsSource === "auto";

  const geminiCallCount =
    (translationUsed ? 1 : 0) +
    (styleRefineUsed ? 1 : 0) +
    (lyricsGenerationUsed ? 1 : 0);

  const estimatedGeminiCostUsd =
    geminiCallCount > 0
      ? geminiCallCount * GEMINI_FLASH_LITE_COST_PER_CALL_USD
      : null;

  const estimatedTotalCostUsd =
    estimatedMusicCostUsd + (estimatedGeminiCostUsd ?? 0);

  return {
    user_id: userId,
    music_id: musicId,
    prediction_id: generationJobId,
    music_model: musicModel,
    duration_seconds: durationSeconds,
    translation_used: translationUsed,
    lyrics_generation_used: lyricsGenerationUsed,
    style_refine_used: styleRefineUsed,
    estimated_music_cost_usd: estimatedMusicCostUsd,
    estimated_gemini_cost_usd: estimatedGeminiCostUsd,
    estimated_total_cost_usd: estimatedTotalCostUsd,
  };
}
