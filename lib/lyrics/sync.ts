import { fetchGeminiWithRetry } from "../geminiFetch";
import type { LyricsSyncStatus } from "../music";
import { type LyricLine, parseLrcLyrics } from "../player/lyrics";
import { lyricDisplayLines } from "./format";

const LYRICS_SYNC_STATUS = new Set<LyricsSyncStatus>([
  "pending",
  "syncing",
  "synced",
  "failed",
  "skipped",
]);

const DEFAULT_GEMINI_AUDIO_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

const LYRICS_ALIGNMENT_SYSTEM_PROMPT = `You align provided song lyrics to an audio file.

Return only structured JSON.

Rules:
- Use only the exact lyric lines provided by the user message.
- Do not rewrite, combine, paraphrase, translate, or invent lines.
- Return the line_index values in ascending lyrical order.
- start_ms is the approximate moment when the singing of that line begins.
- Omit lines you cannot confidently hear.
- Ignore non-sung instrumental space before, between, or after lyrics.`;

const LYRICS_ALIGNMENT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          line_index: { type: "integer" },
          start_ms: { type: "integer" },
        },
        required: ["line_index", "start_ms"],
      },
    },
  },
  required: ["matches"],
} as const;

type LyricsAlignmentResponse = {
  matches?: Array<{
    line_index?: number;
    start_ms?: number;
  }>;
};

type GeminiFile = {
  name: string;
  uri: string;
  mimeType: string;
};

export function resolveLyricsSyncText(
  metadata: Record<string, unknown>,
): string | undefined {
  const lrc = metadata.lyrics_lrc;
  if (typeof lrc === "string" && lrc.trim()) return lrc;
  const payload = metadata.lyrics_payload;
  if (typeof payload === "string" && payload.trim()) return payload;
  const lyrics = metadata.lyrics;
  return typeof lyrics === "string" ? lyrics : undefined;
}

export function getLyricsSyncStatus(
  metadata: Record<string, unknown>,
): LyricsSyncStatus {
  const explicit = metadata.lyrics_sync_status;
  if (
    typeof explicit === "string" &&
    LYRICS_SYNC_STATUS.has(explicit as LyricsSyncStatus)
  ) {
    return explicit as LyricsSyncStatus;
  }
  return deriveLyricsSyncStatus(metadata);
}

export function deriveLyricsSyncStatus(
  metadata: Record<string, unknown>,
): LyricsSyncStatus {
  if (metadata.instrumental === true) return "skipped";

  const raw = resolveLyricsSyncText(metadata);
  if (!raw || raw.trim() === "[Instrumental]") return "skipped";
  if (!lyricDisplayLines(raw).length) return "skipped";
  return parseLrcLyrics(raw).length ? "synced" : "pending";
}

export function shouldContinueLyricsPolling(
  metadata: Record<string, unknown>,
): boolean {
  const status = getLyricsSyncStatus(metadata);
  return status === "pending" || status === "syncing";
}

// A client-side cutoff independent of server state: if lyrics sync hasn't
// settled within this window (e.g. the background job got stuck), the
// client stops polling for it rather than retrying forever.
export const LYRICS_POLL_MAX_WAIT_MS = 2 * 60 * 1000;

export function shouldStopLyricsPolling(
  pollingStartedAtMs: number,
  nowMs: number,
  maxWaitMs: number = LYRICS_POLL_MAX_WAIT_MS,
): boolean {
  return nowMs - pollingStartedAtMs > maxWaitMs;
}

export function buildInitialLyricsSyncMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const status = deriveLyricsSyncStatus(metadata);
  if (status !== "synced") {
    return { ...metadata, lyrics_sync_status: status };
  }

  const raw = resolveLyricsSyncText(metadata);
  const lrc = raw ? serializeLrc(parseLrcLyrics(raw)) : undefined;
  return {
    ...metadata,
    lyrics_sync_status: "synced",
    ...(lrc ? { lyrics_lrc: lrc } : {}),
  };
}

export function serializeLrc(lines: LyricLine[]): string {
  return lines
    .map((line) => `${formatLrcTimestamp(line.startMs)}${line.text}`)
    .join("\n");
}

export function buildLrcFromTimedMatches(
  lyricLines: string[],
  matches: Array<{ line_index?: number; start_ms?: number }>,
  durationSeconds?: number | null,
): string {
  const maxMs =
    typeof durationSeconds === "number" && durationSeconds > 0
      ? durationSeconds * 1000 + 5000
      : Number.POSITIVE_INFINITY;

  const normalized = matches
    .map((match) => {
      const lineIndex = Number(match.line_index);
      const startMs = Number(match.start_ms);
      if (
        !Number.isInteger(lineIndex) ||
        !Number.isFinite(startMs) ||
        lineIndex < 1 ||
        lineIndex > lyricLines.length ||
        startMs < 0 ||
        startMs > maxMs
      ) {
        return null;
      }
      return {
        lineIndex,
        startMs: Math.round(startMs),
        text: lyricLines[lineIndex - 1],
      };
    })
    .filter((line): line is { lineIndex: number; startMs: number; text: string } => Boolean(line))
    .sort((a, b) => a.startMs - b.startMs);

  const seen = new Set<number>();
  const deduped: LyricLine[] = [];
  for (const line of normalized) {
    if (seen.has(line.lineIndex)) continue;
    seen.add(line.lineIndex);
    deduped.push({ startMs: line.startMs, text: line.text });
  }

  return serializeLrc(deduped);
}

export async function generateLyricsLrcFromAudio({
  audioUrl,
  lyrics,
  durationSeconds,
}: {
  audioUrl: string;
  lyrics: string;
  durationSeconds?: number | null;
}): Promise<{ lrc: string; model: string }> {
  const lyricLines = lyricDisplayLines(lyrics);
  if (!lyricLines.length) throw new Error("lyrics_sync_skipped");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("gemini_unconfigured");

  const model = process.env.GEMINI_AUDIO_MODEL || DEFAULT_GEMINI_AUDIO_MODEL;
  const file = await uploadAudioFileToGemini(audioUrl, apiKey);

  try {
    const prompt = buildLyricsAlignmentPrompt(lyricLines, durationSeconds);
    const url = `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`;
    const res = await fetchGeminiWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: LYRICS_ALIGNMENT_SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  file_data: {
                    mime_type: file.mimeType,
                    file_uri: file.uri,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: LYRICS_ALIGNMENT_RESPONSE_SCHEMA,
          },
        }),
      },
      { timeoutMs: 60000, maxRetries: 1 },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`lyrics sync gemini non-ok ${res.status}`, detail.slice(0, 500));
      throw new Error("gemini_failed");
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const out = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!out) throw new Error("lyrics_sync_bad_output");

    const parsed = parseLyricsAlignmentResponse(out);
    const lrc = buildLrcFromTimedMatches(
      lyricLines,
      parsed.matches ?? [],
      durationSeconds,
    );
    if (!lrc.trim()) throw new Error("lyrics_sync_empty");
    return { lrc, model };
  } finally {
    void deleteGeminiFile(file.name, apiKey);
  }
}

function buildLyricsAlignmentPrompt(
  lyricLines: string[],
  durationSeconds?: number | null,
): string {
  const lines = lyricLines
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  const durationHint =
    typeof durationSeconds === "number" && durationSeconds > 0
      ? `Track duration: about ${Math.round(durationSeconds)} seconds.\n`
      : "";

  return `${durationHint}Align the following lyric lines to the attached audio.

Return JSON with a single "matches" array. Each item must contain:
- "line_index": the 1-based lyric line index from the list below
- "start_ms": integer milliseconds when the line starts being sung

Return only lines you can confidently hear, and keep them in ascending song order.

LYRIC LINES
${lines}`;
}

async function uploadAudioFileToGemini(
  audioUrl: string,
  apiKey: string,
): Promise<GeminiFile> {
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) {
    throw new Error(`lyrics_sync_audio_fetch_failed_${audioRes.status}`);
  }

  const bytes = await audioRes.arrayBuffer();
  const mimeType = audioRes.headers.get("content-type") || "audio/mpeg";
  const displayName = `lyrics-sync-${Date.now()}.mp3`;

  const startRes = await fetchGeminiWithRetry(
    `${GEMINI_BASE_URL}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
      },
      body: JSON.stringify({
        file: {
          display_name: displayName,
        },
      }),
    },
    { timeoutMs: 20000, maxRetries: 1 },
  );

  if (!startRes.ok) {
    const detail = await startRes.text().catch(() => "");
    console.error("lyrics sync upload start failed", detail.slice(0, 500));
    throw new Error("lyrics_sync_upload_start_failed");
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("lyrics_sync_upload_url_missing");

  const finalizeRes = await fetchGeminiWithRetry(
    uploadUrl,
    {
      method: "POST",
      headers: {
        "Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: bytes,
    },
    { timeoutMs: 60000, maxRetries: 1 },
  );

  if (!finalizeRes.ok) {
    const detail = await finalizeRes.text().catch(() => "");
    console.error("lyrics sync upload finalize failed", detail.slice(0, 500));
    throw new Error("lyrics_sync_upload_finalize_failed");
  }

  const data = (await finalizeRes.json()) as {
    file?: {
      name?: string;
      uri?: string;
      mimeType?: string;
      mime_type?: string;
    };
    name?: string;
    uri?: string;
    mimeType?: string;
    mime_type?: string;
  };

  const file = data.file ?? data;
  const name = file.name;
  const uri = file.uri;
  const uploadedMimeType = file.mimeType ?? file.mime_type ?? mimeType;
  if (!name || !uri || !uploadedMimeType) {
    throw new Error("lyrics_sync_file_missing");
  }

  return { name, uri, mimeType: uploadedMimeType };
}

async function deleteGeminiFile(name: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${GEMINI_BASE_URL}/v1beta/${name}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("lyrics sync file delete failed", { name, err });
  }
}

function parseLyricsAlignmentResponse(text: string): LyricsAlignmentResponse {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  try {
    return JSON.parse(raw) as LyricsAlignmentResponse;
  } catch {
    throw new Error("lyrics_sync_bad_output");
  }
}

function formatLrcTimestamp(startMs: number): string {
  const safe = Math.max(0, Math.round(startMs));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const centiseconds = Math.floor((safe % 1000) / 10);
  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}]`;
}
