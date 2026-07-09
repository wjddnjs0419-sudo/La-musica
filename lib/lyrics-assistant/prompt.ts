// AI Lyrics Assistant — server-side helpers that turn the workspace song
// settings + an iterative chat history into a Gemini request and back into a
// structured lyrics object. Reuses the same free-tier Gemini REST pattern as
// `lib/translatePrompt.ts` (no SDK dependency, GEMINI_API_KEY / GEMINI_MODEL).
//
// This module never deducts credits and never touches music generation — it
// only produces lyrics text that the client drops into the existing Lyrics
// textarea.

import { fetchGeminiWithRetry } from "../geminiFetch";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// One chat turn. `assistant` turns carry the structured lyrics the model
// produced; `user` turns carry free-text feedback/instructions.
export interface LyricsChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Snapshot of the workspace song settings, mirrored from the prompt box state.
// Every field is optional — the assistant works with whatever is available.
export interface LyricsContext {
  prompt?: string;
  genre?: string;
  moods?: string[];
  vocalMode?: string;
  language?: string;
  useCase?: string;
}

// Structured lyrics the API returns and the modal previews / applies.
export interface LyricsResult {
  title: string;
  lyrics: string;
  hook: string;
  notes: string;
}

export const LYRICS_SYSTEM_PROMPT = `You are La Musica's songwriting assistant. You help users write original song lyrics that will be fed into an AI music generation system.

CORE RULES
- Write ONLY original, copyright-safe lyrics. Never reproduce, quote, or closely paraphrase existing songs, poems, or copyrighted text.
- Never imitate a specific artist, band, song, melody, or copyrighted track. Do not mimic an identifiable artist's signature phrasing or persona.
- If the user references a specific artist, song, album, or track, DO NOT copy it. Silently convert the reference into generic musical descriptors (genre, tempo, energy, mood, instrumentation, vocal style) and write something fresh in that style.

STRUCTURE
- Use clear section tags on their own lines, chosen from: [Intro], [Verse], [Verse 2], [Pre Chorus], [Chorus], [Hook], [Post Chorus], [Bridge], [Final Chorus], [Outro]. Use only the sections the song needs.
- Prefer a catchy, memorable hook and a repeatable chorus.
- Keep the output concise enough for a normal song generation workflow — typically 1-2 verses, a chorus, and optionally a pre-chorus / bridge / drop. Do not write extremely long lyrics.

STYLE — honor the provided song settings when present
- Language: write the lyrics in the language given in the song settings. If no language is specified, default to English. The user's chat/instructions may be written in any language, but that does NOT change the lyric language unless they explicitly ask for a specific target language (e.g. "translate it to Portuguese").
- Vocal mode: adapt to it. For instrumental, return minimal or no sung words (you may use short ad-libs / chant tags); for rap, write rhythmic bars; for crowd chant, write short repeatable shout-along lines.
- Respect the genre, moods, and use case (e.g. TikTok/Reels → short, hooky, loopable; workout/club → high energy; ballad → emotional).

ITERATION
- Treat the conversation as iterative editing of the SAME song unless the user clearly asks for a new one. Apply feedback like "make it shorter", "make the chorus catchier", "translate to Portuguese", "make it more aggressive", "add a bridge", "make it better for TikTok/Reels" by revising the latest lyrics.

OUTPUT
- Respond with a single JSON object matching the provided schema: title, lyrics, hook, notes.
- "lyrics" contains the full lyrics with section tags and line breaks.
- "hook" is the single most catchy/repeatable line or short phrase.
- "notes" is a brief (1-2 sentence) explanation of what you wrote or changed. Keep it short.`;

// JSON schema handed to Gemini's `responseSchema` so the model is forced to
// return exactly the shape `LyricsResult` expects.
export const LYRICS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    lyrics: { type: "string" },
    hook: { type: "string" },
    notes: { type: "string" },
  },
  required: ["title", "lyrics", "hook", "notes"],
} as const;

// Render the workspace settings into a compact, model-friendly block. Omits
// empty fields so the model isn't told about settings the user didn't pick.
function formatContext(context: LyricsContext | undefined): string {
  if (!context) return "(no song settings provided)";
  const lines: string[] = [];
  if (context.prompt?.trim()) lines.push(`Main prompt / idea: ${context.prompt.trim()}`);
  if (context.genre?.trim()) lines.push(`Genre: ${context.genre.trim()}`);
  if (context.moods?.length) lines.push(`Moods: ${context.moods.join(", ")}`);
  if (context.vocalMode?.trim()) lines.push(`Vocal mode: ${context.vocalMode.trim()}`);
  if (context.language?.trim()) lines.push(`Language: ${context.language.trim()}`);
  if (context.useCase?.trim()) lines.push(`Use case: ${context.useCase.trim()}`);
  return lines.length ? lines.join("\n") : "(no song settings provided)";
}

// Build the Gemini `contents` array from the chat history plus a leading
// user turn that carries the song settings and current lyrics. The system
// prompt is sent separately via `system_instruction`.
export function buildLyricsContents(
  messages: LyricsChatMessage[],
  context: LyricsContext | undefined,
  currentLyrics: string | undefined,
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const briefingParts = [
    "SONG SETTINGS:",
    formatContext(context),
  ];
  if (currentLyrics?.trim()) {
    briefingParts.push("", "CURRENT LYRICS (revise these unless told otherwise):", currentLyrics.trim());
  }

  const contents: { role: "user" | "model"; parts: { text: string }[] }[] = [
    { role: "user", parts: [{ text: briefingParts.join("\n") }] },
  ];

  // Gemini uses "model" for assistant turns. Assistant turns carry the prior
  // structured result serialized back to JSON so the model sees its own edits.
  for (const m of messages) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }

  // If the latest turn isn't a user instruction, nudge an initial draft.
  if (contents[contents.length - 1]?.role !== "user") {
    contents.push({
      role: "user",
      parts: [{ text: "Write the lyrics now based on the song settings above." }],
    });
  }

  return contents;
}

// Parse Gemini's structured response into a `LyricsResult`. Tolerates a
// JSON string wrapped in markdown fences. Returns null on unrecoverable output.
export function parseLyricsResult(text: string): LyricsResult | null {
  if (!text?.trim()) return null;
  let raw = text.trim();
  // Strip ```json ... ``` fences if the model added them despite JSON mode.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  try {
    const obj = JSON.parse(raw) as Partial<LyricsResult>;
    if (typeof obj.lyrics !== "string" || !obj.lyrics.trim()) return null;
    return {
      title: typeof obj.title === "string" ? obj.title : "",
      lyrics: obj.lyrics,
      hook: typeof obj.hook === "string" ? obj.hook : "",
      notes: typeof obj.notes === "string" ? obj.notes : "",
    };
  } catch {
    return null;
  }
}

// Call the Gemini REST API and return structured lyrics. Throws a tagged Error
// (`gemini_unconfigured` / `gemini_failed` / `gemini_bad_output`) so the route
// can map it to a clean response code. Never deducts credits.
export async function generateLyrics(
  messages: LyricsChatMessage[],
  context: LyricsContext | undefined,
  currentLyrics: string | undefined,
): Promise<LyricsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("gemini_unconfigured");

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let res: Response;
  try {
    res = await fetchGeminiWithRetry(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: LYRICS_SYSTEM_PROMPT }] },
        contents: buildLyricsContents(messages, context, currentLyrics),
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: LYRICS_RESPONSE_SCHEMA,
        },
      }),
    });
  } catch (err) {
    // Network / DNS / TLS failure reaching Gemini.
    console.error("lyrics gemini fetch threw", err);
    throw new Error("gemini_failed");
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`lyrics gemini non-ok ${res.status}`, detail.slice(0, 500));
    throw new Error("gemini_failed");
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const out = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  const parsed = out ? parseLyricsResult(out) : null;
  if (!parsed) throw new Error("gemini_bad_output");
  return parsed;
}
