import { generateLyrics, type LyricsContext } from "./prompt";

// Auto-generate original lyrics for a vocal song when the user leaves the
// lyrics field blank. Wraps the interactive lyrics assistant's generateLyrics
// with a single initial user prompt so the generate route can call it inline.
// Throws on any Gemini failure — callers should handle gracefully.
export async function generateAutoLyricsForSong(
  context: LyricsContext,
): Promise<string> {
  // Empty messages: buildLyricsContents inserts the song-settings briefing as
  // the sole user turn, then adds "Write the lyrics now..." nudge because no
  // user message follows — producing a clean single-turn Gemini request.
  const result = await generateLyrics([], context, undefined);
  return result.lyrics;
}
