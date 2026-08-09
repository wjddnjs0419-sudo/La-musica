import Replicate, { type FileOutput } from "replicate";

export const THUMBNAIL_MODEL = "black-forest-labs/flux-schnell";

export function createThumbnailPrediction(replicate: Replicate, prompt: string) {
  return replicate.predictions.create({
    model: THUMBNAIL_MODEL,
    input: {
      prompt,
      aspect_ratio: "1:1",
      output_format: "webp",
    },
  });
}

export async function downloadThumbnailOutput(output: unknown): Promise<Blob> {
  const firstOutput = Array.isArray(output) ? output[0] : output;
  return outputToBlob(firstOutput);
}

async function outputToBlob(output: unknown): Promise<Blob> {
  if (isFileOutput(output)) {
    return output.blob();
  }

  if (output instanceof URL) {
    return fetchBlob(output.toString());
  }

  if (typeof output === "string") {
    return fetchBlob(output);
  }

  throw new Error("thumbnail_output_empty");
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`thumbnail_download_failed:${response.status}`);
  }
  return response.blob();
}

function isFileOutput(value: unknown): value is FileOutput {
  return (
    typeof value === "object" &&
    value !== null &&
    "blob" in value &&
    typeof (value as { blob?: unknown }).blob === "function"
  );
}
