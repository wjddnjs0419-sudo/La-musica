import type { BuildMusicPromptInput, ResolvedVocalMode } from "./types";
import {
  CANONICAL_SECTION_TAGS,
  normalizeSectionTags,
  sanitizeLyricsForModel,
} from "../lyrics/format";

const MAX_LYRICS_CHARS = 3500;
export { CANONICAL_SECTION_TAGS };

// Build the lyrics field sent to the music model. Instrumental songs carry no
// sung words (compileMusicPrompt returns `lyrics: undefined` for instrumental
// mode; buildAceStepInput turns that into the literal "[Instrumental]" value
// downstream). For vocal songs, preserve the user's words and normalize
// section tags; wrap unstructured input in a single [Verse] tag.
export function buildLyricsPayload(
  input: BuildMusicPromptInput,
  resolvedVocalMode: ResolvedVocalMode,
): string | undefined {
  if (resolvedVocalMode === "instrumental") return undefined;

  const raw = input.lyrics?.trim();
  if (!raw) return undefined;

  const sanitized = sanitizeLyricsForModel(raw);
  if (!sanitized) return undefined;

  const hasTags = /\[[^\]]+\]/.test(sanitized);
  const payload = hasTags ? normalizeSectionTags(sanitized) : `[Verse]\n${sanitized}`;
  return payload.slice(0, MAX_LYRICS_CHARS);
}
