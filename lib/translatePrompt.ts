// Translate a user's free-text music description into English before it is fed
// to the prompt compiler, so non-English users still get the same engineered
// English MiniMax prompt quality. Uses Google's free-tier Gemini API directly
// over REST (no SDK dependency). Translation never blocks generation: any
// failure falls back to the original text.

// Default to a fast, cheap, GA free-tier model. `gemini-2.0-flash` is
// deprecated (EOL 2026-06-01) and must not be used. Override via GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

// Decide whether a description needs translation. Pure + cheap so the common
// English path skips the network call entirely. Pure-ASCII text is assumed to
// already be English; any non-ASCII character (Hangul, accents, CJK, Arabic, …)
// triggers translation.
export function shouldTranslate(text: string): boolean {
  if (!text.trim()) return false;
  return /[^\x00-\x7F]/.test(text);
}

// Translate `text` to English via the Gemini REST API. Returns the original
// text unchanged when translation is unnecessary, unconfigured, or fails.
export async function translateToEnglish(text: string): Promise<string> {
  if (!shouldTranslate(text)) return text;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return text;

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a translation engine for music-generation prompts. Translate the user's text to natural English. Preserve musical intent, genre, mood, and tempo terms. Output ONLY the translated text, with no quotes, labels, or commentary. If the text is already English, return it unchanged.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
      }),
    });

    if (!res.ok) return text;

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const out = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    return out || text;
  } catch {
    return text;
  }
}
