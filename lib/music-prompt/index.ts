export * from "./types";
export { buildMusicPrompt } from "./buildMusicPrompt";
export * from "./reggaeton";
export { sanitizeReferences } from "./sanitizeReferences";
export { buildLyricsPayload } from "./buildLyricsPayload";
export {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  resolveVocalMode,
} from "./presets";

import type { BuildMusicPromptInput, CompiledPrompt } from "./types";
import { buildMusicPrompt } from "./buildMusicPrompt";

// Primary entry point for callers.
export function compileMusicPrompt(input: BuildMusicPromptInput): CompiledPrompt {
  return buildMusicPrompt(input);
}
