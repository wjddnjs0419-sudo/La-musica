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
  // TODO: replace with real line timestamps when the generation backend provides them
  return approximateLyricTimings(lines, durationSeconds ?? 0);
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
