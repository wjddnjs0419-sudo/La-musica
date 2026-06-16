import type { BuildMusicPromptInput, ResolvedVocalMode } from "./types";

const MAX_LYRICS_CHARS = 3500;

// Canonical section tag spellings keyed by lowercase form.
const CANON_TAGS: Record<string, string> = {
  intro: "[Intro]",
  verse: "[Verse]",
  "verse 2": "[Verse 2]",
  "pre chorus": "[Pre Chorus]",
  prechorus: "[Pre Chorus]",
  chorus: "[Chorus]",
  hook: "[Hook]",
  "post chorus": "[Post Chorus]",
  bridge: "[Bridge]",
  "final chorus": "[Final Chorus]",
  outro: "[Outro]",
};

function normalizeTags(lyrics: string): string {
  return lyrics.replace(/\[([^\]]+)\]/g, (match, inner: string) => {
    const key = inner.trim().toLowerCase();
    return CANON_TAGS[key] ?? match;
  });
}

// Build the lyrics field sent to MiniMax. Instrumental songs carry no sung
// words (the integration drops lyrics when is_instrumental is true). For vocal
// songs, preserve the user's words and normalize section tags; wrap
// unstructured input in a single [Verse] tag.
export function buildLyricsPayload(
  input: BuildMusicPromptInput,
  resolvedVocalMode: ResolvedVocalMode,
): string | undefined {
  if (resolvedVocalMode === "instrumental") return undefined;

  const raw = input.lyrics?.trim();
  if (!raw) return undefined;

  const hasTags = /\[[^\]]+\]/.test(raw);
  const payload = hasTags ? normalizeTags(raw) : `[Verse]\n${raw}`;
  return payload.slice(0, MAX_LYRICS_CHARS);
}
