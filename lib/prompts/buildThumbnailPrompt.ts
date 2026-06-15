const MAX_CONTEXT_CHARS = 420;

export function buildThumbnailPrompt({
  title,
  genre,
  mood,
  lyrics,
  musicPrompt,
}: {
  title: string;
  genre?: string | null;
  mood?: string | null;
  lyrics?: string | null;
  musicPrompt?: string | null;
}) {
  const lyricsTheme = summarizeText(lyrics);
  const promptConcept = summarizeText(musicPrompt);

  return [
    "Album cover art for an AI-generated song.",
    `Song title concept: ${cleanSegment(title) || "Untitled"}`,
    `Genre: ${cleanSegment(genre) || "AI music"}`,
    `Mood: ${cleanSegment(mood) || promptConcept || "expressive and cinematic"}`,
    `Lyrics theme: ${lyricsTheme || promptConcept || "abstract musical emotion"}`,
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
