const MAX_CONTEXT_CHARS = 420;

export function buildThumbnailPrompt({
  title,
  genre,
  mood,
  lyrics,
}: {
  title: string;
  genre?: string | null;
  mood?: string | null;
  lyrics?: string | null;
}) {
  const lyricsTheme = summarizeText(lyrics);
  const titleConcept = cleanSegment(title) || "Untitled Track";

  return [
    "Square album cover art for an AI-generated song.",
    `Primary concept from song title: ${titleConcept}`,
    `Genre influence: ${cleanSegment(genre) || "modern music"}`,
    `Mood palette: ${cleanSegment(mood) || "expressive and cinematic"}`,
    `Lyric imagery: ${lyricsTheme || "abstract visual metaphor inspired by the title"}`,
    "Interpret the title as the main subject; use genre and mood only for palette, energy, and styling.",
    "Visual style: bold, eye-catching, modern music cover art, square album cover.",
    "No text, no logo, no watermark.",
  ].join("\n");
}

function summarizeText(value?: string | null) {
  const cleaned = cleanSegment(value);
  if (!cleaned) return "";
  return cleaned.length > MAX_CONTEXT_CHARS
    ? `${cleaned.slice(0, MAX_CONTEXT_CHARS - 3)}...`
    : cleaned;
}

function cleanSegment(value?: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
