import type { GenerationReference } from "./types";

const LEGACY_PROVIDER = "replicate-ace-step";
const LEGACY_MODEL = "fishaudio/ace-step-1.5";

type MusicGenerationMetadata = {
  generation?: unknown;
  prediction_id?: unknown;
};

type MusicGenerationRecord = {
  model: string | null;
  metadata: MusicGenerationMetadata;
};

export function resolveGenerationReference(
  music: MusicGenerationRecord,
): GenerationReference | null {
  const modern = modernReference(music.metadata.generation);
  if (modern) return modern;

  const legacyJobId = stringValue(music.metadata.prediction_id);
  if (!legacyJobId) return null;

  return {
    provider: LEGACY_PROVIDER,
    jobId: legacyJobId,
    model: music.model?.trim() || LEGACY_MODEL,
  };
}

function modernReference(value: unknown): GenerationReference | null {
  if (!value || typeof value !== "object") return null;
  const metadata = value as Record<string, unknown>;
  const provider = stringValue(metadata.provider);
  const jobId = stringValue(metadata.job_id);
  const model = stringValue(metadata.model);
  if (!provider || !jobId || !model) return null;
  return { provider, jobId, model };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
