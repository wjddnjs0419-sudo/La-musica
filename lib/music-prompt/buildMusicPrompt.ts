import type { BuildMusicPromptInput, CompiledPrompt } from "./types";
import { PROMPT_COMPILER_VERSION } from "./types";
import {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  resolveVocalMode,
} from "./presets";
import { sanitizeReferences } from "./sanitizeReferences";
import { buildLyricsPayload } from "./buildLyricsPayload";

const MAX_PROMPT_CHARS = 2000;

const COPYRIGHT_LINE =
  "original composition only, do not imitate any specific artist, song, melody, or copyrighted track.";

const INSTRUMENTAL_BOOSTER =
  "full instrumental arrangement, strong instrumental presence, polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement";

const VOCAL_BOOSTER =
  "vocal-centered but with rich full instrumental backing, strong chorus impact, polished professional mix, no acapella sections, no empty background";

// De-duplicate comma-separated descriptor segments case-insensitively,
// preserving first-occurrence order. Genre presets + sanitized references
// often emit the same phrase (e.g. "deep 808 bass") twice.
function dedupeSegments(body: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const seg of body.split(", ")) {
    const key = seg.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(seg);
  }
  return out.join(", ");
}

// Compile a simple user intent + structured options into a dense English
// MiniMax prompt following the 12-part formula.
export function buildMusicPrompt(input: BuildMusicPromptInput): CompiledPrompt {
  const raw = input.userDescription?.trim() ?? "";
  const vocalMode = resolveVocalMode(input);
  const instrumental = vocalMode === "instrumental";

  // 1. User intent + reference text, run through the sanitizer.
  const refSource = [input.referenceText, raw].filter(Boolean).join(". ");
  const sanitizedIntent = sanitizeReferences(refSource);

  const parts: string[] = [];

  // 2. Genre preset (skipped for custom/unset — sanitized intent carries style).
  if (input.genre && input.genre !== "custom") {
    parts.push(GENRE_PRESETS[input.genre]);
  }

  // 1. User intent summary.
  if (sanitizedIntent) parts.push(sanitizedIntent);

  // 3. Mood preset(s).
  const moods = (input.moods ?? []).map((m) => MOOD_PRESETS[m]).filter(Boolean);
  if (moods.length) parts.push(moods.join(", "));

  // 4. Use-case preset.
  if (input.useCase && input.useCase !== "custom") {
    parts.push(USE_CASE_PRESETS[input.useCase]);
  }

  // 9. Vocal/instrumental direction.
  parts.push(VOCAL_PRESETS[vocalMode]);

  // 10. Production/mix quality booster.
  parts.push(instrumental ? INSTRUMENTAL_BOOSTER : VOCAL_BOOSTER);

  // 11. BPM / key if provided.
  if (typeof input.bpm === "number" && input.bpm > 0) parts.push(`${input.bpm} BPM`);
  if (input.key && input.key.trim()) parts.push(`key of ${input.key.trim()}`);

  // Build the body WITHOUT the copyright line, then clamp the body so the
  // always-appended copyright clause is never truncated. The "- 2" reserves
  // room for the ", " separator joining body + copyright line.
  const body = dedupeSegments(
    parts.filter(Boolean).join(", ").replace(/\s+/g, " ").trim(),
  ).slice(0, MAX_PROMPT_CHARS - COPYRIGHT_LINE.length - 2);

  // 12. Safety/copyright instruction (always intact).
  const prompt = `${body}, ${COPYRIGHT_LINE}`.replace(/\s+/g, " ").trim();

  const lyrics = buildLyricsPayload(input, vocalMode);

  return {
    prompt,
    lyrics,
    instrumental,
    metadata: {
      raw_user_description: raw,
      final_music_prompt: prompt,
      prompt_version: PROMPT_COMPILER_VERSION,
      genre: input.genre,
      moods: input.moods,
      use_case: input.useCase,
      vocal_mode: vocalMode,
      language: input.language,
    },
  };
}
