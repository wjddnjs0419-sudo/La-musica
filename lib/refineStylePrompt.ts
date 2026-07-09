// Refine the compiled style prompt with one Gemini pass. The deterministic
// `compileMusicPrompt` concatenates preset descriptors into a dense, redundant
// "comma soup" (allowed to run up to buildMusicPrompt's own 2000-char limit);
// this rewrites it into a single coherent, descriptor-style prompt short
// enough for ACE-Step's ~500-char `prompt` field, while keeping every musical
// descriptor the presets guaranteed. Mirrors the free-tier Gemini REST pattern
// in `translatePrompt.ts` (no SDK; GEMINI_API_KEY / GEMINI_MODEL). Separate
// Gemini call from translation. Never blocks generation: any failure returns
// the original compiled prompt unchanged (which is then hard-clamped to
// ACE_STEP's limit downstream in `buildAceStepInput`, so an over-long fallback
// still can't reach Replicate uncapped).

import { COPYRIGHT_LINE } from "./music-prompt/buildMusicPrompt";
import { fetchGeminiWithRetry } from "./geminiFetch";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// ACE-Step prompt hard limit — shorter than buildMusicPrompt.ts's own
// 2000-char pre-refine clamp on purpose: this is the limit on what actually
// reaches ACE-Step (via buildAceStepInput in lib/music.ts), not on the
// intermediate comma-soup this function receives as input.
const MAX_PROMPT_CHARS = 500;

// Any descriptor clause that is really a copyright/imitation directive. The LLM
// often paraphrases the instruction ("do not imitate any artist", "no copyright")
// instead of echoing it verbatim, which previously slipped past an exact-match
// check and produced a duplicated tail.
const COPYRIGHT_CLAUSE_RE = /imitate|copyright|original composition/i;

// Strip every copyright/imitation clause so we can re-append exactly one canon
// clause. Remove the verbatim canon line first (it contains internal commas, so
// a naive comma-split would leave orphan fragments like "song"/"melody"), then
// drop any remaining paraphrased clauses.
function stripCopyrightClauses(text: string): string {
  return text
    .split(COPYRIGHT_LINE)
    .join(" ")
    .split(",")
    .map((clause) => clause.trim())
    .filter((clause) => clause && !COPYRIGHT_CLAUSE_RE.test(clause))
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deterministically guarantee the safety/copyright clause and the length limit.
// We never trust the LLM for the copyright clause: strip whatever it emitted
// (verbatim or paraphrased) and re-append exactly one canon clause, then clamp
// the body so the clause is never truncated (same clamping mechanism as
// buildMusicPrompt's own compiler clamp, just a shorter limit tuned for
// ACE-Step's `prompt` field instead of MiniMax's). Empty refined output — or
// output that is nothing but copyright text — falls back to the original
// prompt.
export function finalizeRefined(refinedText: string, fallback: string): string {
  const trimmed = refinedText.replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;

  const stripped = stripCopyrightClauses(trimmed);
  if (!stripped) return fallback;

  const body = stripped.slice(0, MAX_PROMPT_CHARS - COPYRIGHT_LINE.length - 2);
  return `${body}, ${COPYRIGHT_LINE}`.replace(/\s+/g, " ").trim();
}

const SYSTEM_INSTRUCTION =
  "You are a prompt engineer for the ACE-Step music generation model. You receive a machine-assembled style prompt whose descriptors come from genre/mood/use-case presets and may be redundant or disorganized. Rewrite it into ONE coherent, dense, comma-separated descriptor prompt (NOT prose, NOT sentences), no more than 400 characters — the copyright clause is appended automatically afterward and needs the remaining room, so a longer output will be truncated. Preserve the most important musical descriptors, BPM, key, and vocal/instrumental direction, dropping lower-priority descriptors first if you must cut for length. Do NOT include any copyright, 'original composition', or 'do not imitate' clause — that is appended automatically afterward, so omit it entirely. Remove duplicate or contradictory descriptors and order them naturally (overall style first, then rhythm, instrumentation, mix, vocals). Do not add new genres or instruments that were not implied. Output ONLY the rewritten prompt, no labels or commentary.";

// Free-tier Gemini can stall; without a deadline a single slow call blocks every
// generation. Bound it and fall back to the compiled prompt on timeout.
const REFINE_TIMEOUT_MS = 8000;

// Rewrite the compiled prompt via Gemini. Returns the original `compiledPrompt`
// (already copyright-safe) on any unconfigured/non-ok/network failure.
export async function refineStylePrompt(
  compiledPrompt: string,
  instrumental: boolean,
): Promise<string> {
  const input = compiledPrompt.trim();
  if (!input) return compiledPrompt;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return compiledPrompt;

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const directive = instrumental
    ? "This is an instrumental track; keep the no-vocals direction."
    : "This is a vocal track; keep the vocal direction.";

  try {
    const res = await fetchGeminiWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [
            { role: "user", parts: [{ text: `${directive}\n\n${input}` }] },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        }),
      },
      { timeoutMs: REFINE_TIMEOUT_MS },
    );

    if (!res.ok) return compiledPrompt;

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const out = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    return out ? finalizeRefined(out, compiledPrompt) : compiledPrompt;
  } catch {
    return compiledPrompt;
  }
}
