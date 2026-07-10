import { describe, it, expect } from "vitest";
import {
  parseMusicLyrics,
  approximateLyricTimings,
  findActiveLineIndex,
} from "./lyrics";

describe("parseMusicLyrics", () => {
  it("returns null when metadata has no lyrics field", () => {
    expect(parseMusicLyrics({}, 180)).toBeNull();
  });

  it("returns null for [Instrumental] lyrics", () => {
    expect(parseMusicLyrics({ lyrics: "[Instrumental]" }, 180)).toBeNull();
  });

  it("returns null for empty/whitespace lyrics", () => {
    expect(parseMusicLyrics({ lyrics: "" }, 180)).toBeNull();
    expect(parseMusicLyrics({ lyrics: "   " }, 180)).toBeNull();
  });

  it("filters section tags like [Verse] and [Chorus]", () => {
    const lines = parseMusicLyrics(
      { lyrics: "[Verse]\nHello world\n[Chorus]\nSing along" },
      60,
    );
    expect(lines).not.toBeNull();
    expect(lines!.map((l) => l.text)).toEqual(["Hello world", "Sing along"]);
  });

  it("returns empty array (not null) when duration is 0 — caller must supply real duration", () => {
    const lines = parseMusicLyrics({ lyrics: "Some lyrics" }, 0);
    // Empty array because approximateLyricTimings bails on duration=0.
    // FullScreenPlayer must pass resolvedDuration (audio element actual duration)
    // not track.duration_seconds which may be null before audio loads.
    expect(lines).toEqual([]);
  });

  it("returns timed LyricLine array when lyrics and positive duration are provided", () => {
    const lines = parseMusicLyrics({ lyrics: "Line one\nLine two" }, 60);
    expect(lines).toHaveLength(2);
    // 10% intro offset (6000ms) + lyrics span 10%–95% of duration
    // range = 51000ms; line 0 at 6000ms, line 1 at 6000 + 25500 = 31500ms
    expect(lines![0].startMs).toBe(6000);
    expect(lines![0].text).toBe("Line one");
    expect(lines![1].startMs).toBe(31500);
    expect(lines![1].text).toBe("Line two");
  });
});

describe("approximateLyricTimings", () => {
  it("distributes lines evenly across duration", () => {
    const result = approximateLyricTimings(["A", "B", "C"], 30);
    expect(result[0].startMs).toBe(0);
    expect(result[1].startMs).toBe(10000);
    expect(result[2].startMs).toBe(20000);
  });

  it("returns empty array when duration is 0", () => {
    expect(approximateLyricTimings(["A", "B"], 0)).toEqual([]);
  });

  it("returns empty array when lines is empty", () => {
    expect(approximateLyricTimings([], 60)).toEqual([]);
  });
});

describe("findActiveLineIndex", () => {
  const lines = [
    { startMs: 0, text: "A" },
    { startMs: 10000, text: "B" },
    { startMs: 20000, text: "C" },
  ];

  it("returns 0 before the first line starts", () => {
    expect(findActiveLineIndex(lines, 0)).toBe(0);
  });

  it("returns correct index mid-song", () => {
    expect(findActiveLineIndex(lines, 15000)).toBe(1);
  });

  it("returns last index after the last line starts", () => {
    expect(findActiveLineIndex(lines, 25000)).toBe(2);
  });
});
