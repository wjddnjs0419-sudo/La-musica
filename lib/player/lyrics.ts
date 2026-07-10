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
  const raw = metadata?.lyrics as string | undefined;
  if (!raw || raw.trim() === "[Instrumental]" || !raw.trim()) return null;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\[.*\]$/.test(l));
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

export function findActiveLineIndex(
  lines: LyricLine[],
  currentTimeMs: number,
): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTimeMs >= lines[i].startMs) return i;
  }
  return 0;
}
