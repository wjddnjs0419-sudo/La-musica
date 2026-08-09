// Deterministic, title-only prompt — no Gemini refinement step, matching
// the title generation pipeline (lib/musicTitle.ts). Joined with spaces
// rather than newlines: Replicate's flux-schnell model reproducibly fails
// predictions ("Director: unexpected error handling prediction") on
// multi-line prompts regardless of length, confirmed by direct repro.
export function buildThumbnailPrompt({ title }: { title: string }): string {
  const titleConcept = cleanSegment(title) || "Untitled Track";

  return [
    "Square album cover art for an AI-generated song.",
    `Primary concept from song title: ${titleConcept}`,
    "Interpret the title as the main subject; choose palette, energy, and styling that fit the mood the title suggests.",
    "Visual style: bold, eye-catching, modern music cover art, square album cover.",
    "No text, no logo, no watermark.",
  ].join(" ");
}

function cleanSegment(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
