import { describe, it, expect } from "vitest";
import {
  parseMusicLyrics,
  parseLrcLyrics,
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

  it("prefers normalized lyrics_payload over raw lyrics", () => {
    const lines = parseMusicLyrics(
      {
        lyrics: "[Verse]\n(raw intro)\nRaw line",
        lyrics_payload: "[Verse]\nClean line\n[Chorus]\nClean hook",
      },
      60,
    );
    expect(lines!.map((l) => l.text)).toEqual(["Clean line", "Clean hook"]);
  });

  it("prefers true LRC metadata over lyrics_payload and raw lyrics", () => {
    const lines = parseMusicLyrics(
      {
        lyrics: "Raw line",
        lyrics_payload: "Clean line",
        lyrics_lrc: "[00:04.50]Timed line\n[00:08.25]Timed hook",
      },
      60,
    );

    expect(lines).toEqual([
      { startMs: 4500, endMs: 8250, text: "Timed line" },
      { startMs: 8250, endMs: undefined, text: "Timed hook" },
    ]);
  });

  it("uses LRC timestamps embedded in lyrics_payload for any lyrics source", () => {
    const lines = parseMusicLyrics(
      {
        lyrics_payload: "[Verse]\n[00:10.00]Auto or user line\n[00:14.75]Shared sync path",
        lyrics_source: "auto",
      },
      null,
    );

    expect(lines).toEqual([
      { startMs: 10000, endMs: 14750, text: "Auto or user line" },
      { startMs: 14750, endMs: undefined, text: "Shared sync path" },
    ]);
  });

  it("removes recognized bracket tags/directions but never touches parenthetical lyrics", () => {
    const lines = parseMusicLyrics(
      {
        lyrics:
          "[Verse]\n(Instrumental break)\nFirst line (beat drops)\n(oh yeah)\n[Guitar solo]\nLast line",
      },
      60,
    );
    expect(lines!.map((l) => l.text)).toEqual([
      "(Instrumental break)",
      "First line (beat drops)",
      "(oh yeah)",
      "Last line",
    ]);
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

describe("parseLrcLyrics", () => {
  it("parses centisecond and millisecond LRC timestamps", () => {
    expect(parseLrcLyrics("[01:02.34]Centisecond\n[01:03.456]Millisecond")).toEqual([
      { startMs: 62340, text: "Centisecond" },
      { startMs: 63456, text: "Millisecond" },
    ]);
  });

  it("expands multiple timestamps on one lyric line", () => {
    expect(parseLrcLyrics("[00:01.00][00:02.50]Repeat hook")).toEqual([
      { startMs: 1000, text: "Repeat hook" },
      { startMs: 2500, text: "Repeat hook" },
    ]);
  });

  it("filters section tags but keeps parenthetical lyrics in timed display text", () => {
    expect(
      parseLrcLyrics(
        "[00:01.00][Verse]\n[00:02.00]Sing this (beat drops)\n[00:03.00](oh yeah)",
      ),
    ).toEqual([
      { startMs: 2000, text: "Sing this (beat drops)" },
      { startMs: 3000, text: "(oh yeah)" },
    ]);
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

  it("returns the first index once current time reaches the first line's start", () => {
    expect(findActiveLineIndex(lines, 0)).toBe(0);
  });

  it("returns -1 before the first line's start (no line highlighted yet)", () => {
    const shifted = [
      { startMs: 15000, text: "A" },
      { startMs: 25000, text: "B" },
    ];
    expect(findActiveLineIndex(shifted, 3000)).toBe(-1);
  });

  it("returns correct index mid-song", () => {
    expect(findActiveLineIndex(lines, 15000)).toBe(1);
  });

  it("returns last index after the last line starts", () => {
    expect(findActiveLineIndex(lines, 25000)).toBe(2);
  });
});
