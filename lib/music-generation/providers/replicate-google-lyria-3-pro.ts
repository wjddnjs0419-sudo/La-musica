import Replicate from "replicate";

import { refineStylePrompt } from "../../refineStylePrompt";
import type {
  MusicGenerationProvider,
  MusicGenerationRequest,
  MusicGenerationStatus,
  StartedMusicGeneration,
} from "../types";

export const REPLICATE_GOOGLE_LYRIA_3_PRO_PROVIDER_ID =
  "replicate-google-lyria-3-pro";
export const LYRIA_3_PRO_MODEL = "google/lyria-3-pro";
export const LYRIA_3_PRO_DURATION_SECONDS = 180;
export const LYRIA_3_PRO_COST_PER_OUTPUT_USD = 0.08;
const MAX_STYLE_PROMPT_CHARS = 1_500;

export function buildLyria3ProPrompt({
  prompt,
  lyrics,
  instrumental,
  duration = LYRIA_3_PRO_DURATION_SECONDS,
}: MusicGenerationRequest): string {
  const targetDuration = Math.min(Math.max(Math.round(duration), 1), 180);
  const direction = prompt.trim().slice(0, MAX_STYLE_PROMPT_CHARS);
  const mode = instrumental
    ? "Create an original instrumental track with no vocals."
    : "Create an original vocal song using the supplied lyrics.";
  const lyricsBlock = !instrumental && lyrics?.trim()
    ? `\n\nLyrics:\n${lyrics.trim()}`
    : "";

  return `${mode}\nTarget duration: about ${targetDuration} seconds.\n\nMusic direction:\n${direction}${lyricsBlock}`;
}

export function normalizeLyria3ProStatus(prediction: {
  status: string;
  output?: unknown;
  error?: unknown;
}): MusicGenerationStatus {
  if (prediction.status === "failed") {
    return {
      state: "failed",
      error: prediction.error ? String(prediction.error) : "generation failed",
    };
  }
  if (prediction.status === "canceled") {
    return { state: "failed", error: "generation canceled" };
  }
  if (prediction.status !== "succeeded") return { state: "pending" };

  const output = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;
  const audioUrl = outputUrl(output);
  return audioUrl
    ? { state: "succeeded", audioUrl }
    : { state: "failed", error: "empty generation output" };
}

function outputUrl(output: unknown): string | null {
  if (typeof output === "string" && output) return output;
  if (!output || typeof output !== "object") return null;

  const url = (output as { url?: unknown }).url;
  if (typeof url !== "function") return null;

  const value = url();
  return typeof value === "string" && value ? value : null;
}

export const replicateGoogleLyria3ProProvider: MusicGenerationProvider = {
  id: REPLICATE_GOOGLE_LYRIA_3_PRO_PROVIDER_ID,
  model: LYRIA_3_PRO_MODEL,
  async start(request): Promise<StartedMusicGeneration> {
    const durationSeconds = Math.min(
      Math.max(Math.round(request.duration ?? LYRIA_3_PRO_DURATION_SECONDS), 1),
      180,
    );
    const effectivePrompt = await refineStylePrompt(
      request.prompt,
      request.instrumental,
      {
        modelLabel: "Google Lyria 3 Pro",
        maxPromptChars: MAX_STYLE_PROMPT_CHARS,
        targetChars: 1_200,
      },
    );
    const prediction = await new Replicate().predictions.create({
      model: LYRIA_3_PRO_MODEL,
      input: {
        prompt: buildLyria3ProPrompt({ ...request, prompt: effectivePrompt }),
      },
    });

    return {
      provider: REPLICATE_GOOGLE_LYRIA_3_PRO_PROVIDER_ID,
      jobId: prediction.id,
      model: LYRIA_3_PRO_MODEL,
      effectivePrompt,
      durationSeconds,
      estimatedMusicCostUsd: LYRIA_3_PRO_COST_PER_OUTPUT_USD,
    };
  },
  async getStatus(jobId) {
    return normalizeLyria3ProStatus(
      await new Replicate().predictions.get(jobId),
    );
  },
};
