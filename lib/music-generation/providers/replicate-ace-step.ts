import Replicate from "replicate";
import { refineStylePrompt } from "../../refineStylePrompt";
import type {
  MusicGenerationProvider,
  MusicGenerationRequest,
  MusicGenerationStatus,
  StartedMusicGeneration,
} from "../types";

export const REPLICATE_ACE_STEP_PROVIDER_ID = "replicate-ace-step";
const ACE_STEP_MODEL = "fishaudio/ace-step-1.5";
const ACE_STEP_VERSION = "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85";
export const ACE_STEP_DURATION_SECONDS = 180;
const ACE_STEP_COST_PER_SECOND_USD = 0.000178;
const MAX_PROMPT_CHARS = 500;
const MAX_LYRICS_CHARS = 3500;

export function buildAceStepInput({ prompt, lyrics, instrumental, duration = ACE_STEP_DURATION_SECONDS }: MusicGenerationRequest) {
  return {
    prompt: prompt.trim().slice(0, MAX_PROMPT_CHARS),
    lyrics: instrumental || !lyrics?.trim() ? "[Instrumental]" : lyrics.trim().slice(0, MAX_LYRICS_CHARS),
    duration,
    audio_format: "mp3" as const,
  };
}

export function normalizeReplicateStatus(prediction: { status: string; output?: unknown; error?: unknown }): MusicGenerationStatus {
  if (prediction.status === "failed") return { state: "failed", error: prediction.error ? String(prediction.error) : "generation failed" };
  if (prediction.status === "canceled") return { state: "failed", error: "generation canceled" };
  if (prediction.status !== "succeeded") return { state: "pending" };
  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  return typeof output === "string" && output ? { state: "succeeded", audioUrl: output } : { state: "failed", error: "empty generation output" };
}

export const replicateAceStepProvider: MusicGenerationProvider = {
  id: REPLICATE_ACE_STEP_PROVIDER_ID,
  model: ACE_STEP_MODEL,
  async start(request): Promise<StartedMusicGeneration> {
    const durationSeconds = request.duration ?? ACE_STEP_DURATION_SECONDS;
    const effectivePrompt = await refineStylePrompt(request.prompt, request.instrumental, { modelLabel: "ACE-Step", maxPromptChars: MAX_PROMPT_CHARS, targetChars: 400 });
    const prediction = await new Replicate().predictions.create({ version: ACE_STEP_VERSION, input: buildAceStepInput({ ...request, prompt: effectivePrompt }) });
    return { provider: REPLICATE_ACE_STEP_PROVIDER_ID, jobId: prediction.id, model: ACE_STEP_MODEL, effectivePrompt, durationSeconds, estimatedMusicCostUsd: durationSeconds * ACE_STEP_COST_PER_SECOND_USD };
  },
  async getStatus(jobId) { return normalizeReplicateStatus(await new Replicate().predictions.get(jobId)); },
};
