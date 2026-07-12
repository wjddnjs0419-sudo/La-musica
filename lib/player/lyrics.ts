import { lyricDisplayLines } from "../lyrics/format";

export type LyricLine = {
  startMs: number;
  endMs?: number;
  text: string;
};

export function approximateLyricTimings(
  lines: string[],
  durationSeconds: number,
): LyricLine[] {
  if (!lines.length || !durationSeconds) return [];
  const durationMs = durationSeconds * 1000;
  return lines.map((text, i) => ({
    text,
    startMs: Math.round((i / lines.length) * durationMs),
    endMs: Math.round(((i + 1) / lines.length) * durationMs),
  }));
}

export function parseMusicLyrics(
  metadata: Record<string, unknown>,
  durationSeconds: number | null,
): LyricLine[] | null {
  const raw = resolveLyricsText(metadata);
  if (!raw || raw.trim() === "[Instrumental]" || !raw.trim()) return null;

  const lrcLines = parseLrcLyrics(raw);
  if (lrcLines.length) return withEndTimes(lrcLines);

  const lines = lyricDisplayLines(raw);
  if (!lines.length) return null;
  const dur = durationSeconds ?? 0;
  if (!dur) return [];
  // Assume ~10% intro, ~5% outro — shifts lyrics into the vocal window
  const durationMs = dur * 1000;
  const startMs = durationMs * 0.1;
  const rangeMs = durationMs * 0.85;
  return lines.map((text, i) => ({
    text,
    startMs: Math.round(startMs + (i / lines.length) * rangeMs),
    endMs: Math.round(startMs + ((i + 1) / lines.length) * rangeMs),
  }));
}

function resolveLyricsText(metadata: Record<string, unknown>): string | undefined {
  const lrc = metadata?.lyrics_lrc;
  if (typeof lrc === "string" && lrc.trim()) return lrc;
  const payload = metadata?.lyrics_payload;
  if (typeof payload === "string" && payload.trim()) return payload;
  const lyrics = metadata?.lyrics;
  return typeof lyrics === "string" ? lyrics : undefined;
}

export function parseLrcLyrics(lyrics: string): LyricLine[] {
  const timedLines: LyricLine[] = [];

  for (const rawLine of lyrics.split("\n")) {
    const timestamps = [...rawLine.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!timestamps.length) continue;

    const text = rawLine
      .replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, "")
      .trim();
    if (!text) continue;
    const displayLines = lyricDisplayLines(text);
    if (!displayLines.length) continue;

    for (const timestamp of timestamps) {
      const startMs = lrcTimestampToMs(timestamp);
      if (startMs === null) continue;
      timedLines.push({ startMs, text: displayLines.join(" ") });
    }
  }

  return timedLines.sort((a, b) => a.startMs - b.startMs);
}

function lrcTimestampToMs(match: RegExpMatchArray): number | null {
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds > 59) {
    return null;
  }

  const fraction = match[3] ?? "";
  const fractionMs = fraction
    ? Math.round(Number(`0.${fraction.padEnd(3, "0").slice(0, 3)}`) * 1000)
    : 0;

  return minutes * 60_000 + seconds * 1000 + fractionMs;
}

function withEndTimes(lines: LyricLine[]): LyricLine[] {
  return lines.map((line, index) => ({
    ...line,
    endMs: lines[index + 1]?.startMs,
  }));
}

export function findActiveLineIndex(
  lines: LyricLine[],
  currentTimeMs: number,
): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTimeMs >= lines[i].startMs) return i;
  }
  return 0;
}
