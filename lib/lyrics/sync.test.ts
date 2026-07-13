import { describe, expect, it, vi } from "vitest";

import {
  buildInitialLyricsSyncMetadata,
  buildLrcFromTimedMatches,
  computeLyricsSyncCoverageRatio,
  deriveLyricsSyncStatus,
  generateLyricsLrcFromAudio,
  getLyricsSyncStatus,
  LYRICS_POLL_MAX_WAIT_MS,
  pollGeminiFileUntilActive,
  resolveLyricsPollStart,
  shouldContinueLyricsPolling,
  shouldStopLyricsPolling,
} from "./sync";

describe("deriveLyricsSyncStatus", () => {
  it("skips instrumental tracks", () => {
    expect(deriveLyricsSyncStatus({ instrumental: true, lyrics: "[Instrumental]" })).toBe(
      "skipped",
    );
  });

  it("marks plain lyrics as pending", () => {
    expect(deriveLyricsSyncStatus({ lyrics_payload: "[Verse]\nHello\n[Chorus]\nAgain" })).toBe(
      "pending",
    );
  });

  it("marks timed lyrics as synced", () => {
    expect(
      deriveLyricsSyncStatus({
        lyrics_payload: "[Verse]\n[00:03.25]Hello\n[00:07.80]Again",
      }),
    ).toBe("synced");
  });
});

describe("buildInitialLyricsSyncMetadata", () => {
  it("copies canonical lrc when timestamps already exist", () => {
    expect(
      buildInitialLyricsSyncMetadata({
        lyrics_payload: "[Verse]\n[00:03.25]Hello\n[00:07.80]Again",
      }),
    ).toMatchObject({
      lyrics_sync_status: "synced",
      lyrics_lrc: "[00:03.25]Hello\n[00:07.80]Again",
    });
  });
});

describe("buildLrcFromTimedMatches", () => {
  it("uses exact lyric lines from the source list", () => {
    expect(
      buildLrcFromTimedMatches(
        ["Hello there", "Sing again"],
        [
          { line_index: 2, start_ms: 9000 },
          { line_index: 1, start_ms: 3500 },
        ],
      ),
    ).toBe("[00:03.50]Hello there\n[00:09.00]Sing again");
  });

  it("drops invalid and duplicate matches", () => {
    expect(
      buildLrcFromTimedMatches(
        ["One", "Two"],
        [
          { line_index: 1, start_ms: 1000 },
          { line_index: 1, start_ms: 1200 },
          { line_index: 3, start_ms: 3000 },
          { line_index: 2, start_ms: -50 },
        ],
      ),
    ).toBe("[00:01.00]One");
  });

  it("orders matches by line_index rather than by start_ms", () => {
    // Gemini can return matches out of request order; the lyric line order
    // (line_index), not arrival/start_ms order, is ground truth.
    expect(
      buildLrcFromTimedMatches(
        ["L1", "L2", "L3"],
        [
          { line_index: 3, start_ms: 5000 },
          { line_index: 1, start_ms: 1000 },
          { line_index: 2, start_ms: 3000 },
        ],
      ),
    ).toBe("[00:01.00]L1\n[00:03.00]L2\n[00:05.00]L3");
  });

  it("drops entries whose start_ms regresses relative to the previous line_index", () => {
    // line_index 3 (20s) sits between line_index 1 (26s) and 4 (31s) in
    // lyrical order but its timestamp is earlier — a hallucinated/misheard
    // match. Keeping it would play line 3 before line 1 despite the text
    // order being 1 -> 3 -> 4.
    expect(
      buildLrcFromTimedMatches(
        ["L1", "L2", "L3", "L4"],
        [
          { line_index: 3, start_ms: 20000 },
          { line_index: 1, start_ms: 26000 },
          { line_index: 4, start_ms: 31000 },
        ],
      ),
    ).toBe("[00:26.00]L1\n[00:31.00]L4");
  });
});

describe("computeLyricsSyncCoverageRatio", () => {
  it("returns 1 when every line is matched", () => {
    expect(
      computeLyricsSyncCoverageRatio(
        ["One", "Two"],
        [
          { line_index: 1, start_ms: 1000 },
          { line_index: 2, start_ms: 2000 },
        ],
      ),
    ).toBe(1);
  });

  it("counts only valid, deduped, order-consistent matches toward coverage", () => {
    // 4 lines total; line_index 2 is a duplicate and line_index 4 is
    // dropped by uploaded matches being out of range — only 2 lines land.
    expect(
      computeLyricsSyncCoverageRatio(
        ["L1", "L2", "L3", "L4"],
        [
          { line_index: 1, start_ms: 1000 },
          { line_index: 2, start_ms: 2000 },
          { line_index: 2, start_ms: 2500 },
          { line_index: 9, start_ms: 3000 },
        ],
      ),
    ).toBe(0.5);
  });

  it("returns 0 for an empty lyric line list", () => {
    expect(computeLyricsSyncCoverageRatio([], [])).toBe(0);
  });
});

describe("generateLyricsLrcFromAudio coverage gating", () => {
  it("rejects a response with too few matched lines", async () => {
    const lyrics = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`).join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://cdn.example.com")) {
          return new Response(new ArrayBuffer(8), {
            status: 200,
            headers: { "content-type": "audio/mpeg" },
          });
        }
        if (url.includes("/upload/v1beta/files")) {
          return new Response("{}", {
            status: 200,
            headers: { "x-goog-upload-url": "https://upload.example.com/session" },
          });
        }
        if (url.startsWith("https://upload.example.com")) {
          return new Response(
            JSON.stringify({
              file: { name: "files/abc", uri: "files/abc", mimeType: "audio/mpeg", state: "ACTIVE" },
            }),
            { status: 200 },
          );
        }
        if (url.includes(":generateContent")) {
          // Only 1 of 10 lines matched — well under the coverage floor.
          return new Response(
            JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [{ text: JSON.stringify({ matches: [{ line_index: 1, start_ms: 1000 }] }) }],
                  },
                },
              ],
            }),
            { status: 200 },
          );
        }
        if (url.includes("v1beta/files/abc")) {
          return new Response("{}", { status: 200 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    process.env.GEMINI_API_KEY = "test-key";

    await expect(
      generateLyricsLrcFromAudio({
        audioUrl: "https://cdn.example.com/track.mp3",
        lyrics,
        durationSeconds: 120,
      }),
    ).rejects.toThrow("insufficient_alignment_coverage");

    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
  });
});

describe("pollGeminiFileUntilActive", () => {
  const noopSleep = async () => {};

  it("returns immediately when the file is already ACTIVE", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await pollGeminiFileUntilActive(
      { name: "files/abc", uri: "files/abc", mimeType: "audio/mpeg", state: "ACTIVE" },
      "test-key",
      { sleep: noopSleep },
    );

    expect(result.state).toBe("ACTIVE");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("polls the file resource until it reports ACTIVE", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "PROCESSING" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "ACTIVE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await pollGeminiFileUntilActive(
      { name: "files/abc", uri: "files/abc", mimeType: "audio/mpeg", state: "PROCESSING" },
      "test-key",
      { sleep: noopSleep },
    );

    expect(result.state).toBe("ACTIVE");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("throws when the file transitions to a terminal failure state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "FAILED" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pollGeminiFileUntilActive(
        { name: "files/abc", uri: "files/abc", mimeType: "audio/mpeg", state: "PROCESSING" },
        "test-key",
        { sleep: noopSleep },
      ),
    ).rejects.toThrow("lyrics_sync_file_failed");
    vi.unstubAllGlobals();
  });

  it("gives up after exceeding the max attempts if the file never becomes active", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ state: "PROCESSING" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      pollGeminiFileUntilActive(
        { name: "files/abc", uri: "files/abc", mimeType: "audio/mpeg", state: "PROCESSING" },
        "test-key",
        { sleep: noopSleep, maxAttempts: 3 },
      ),
    ).rejects.toThrow("lyrics_sync_file_active_timeout");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });
});

describe("lyrics sync status helpers", () => {
  it("respects explicit persisted failed status", () => {
    expect(getLyricsSyncStatus({ lyrics: "Hello", lyrics_sync_status: "failed" })).toBe(
      "failed",
    );
  });

  it("keeps polling only for pending/syncing", () => {
    expect(shouldContinueLyricsPolling({ lyrics: "Hello", lyrics_sync_status: "pending" })).toBe(
      true,
    );
    expect(shouldContinueLyricsPolling({ lyrics: "Hello", lyrics_sync_status: "syncing" })).toBe(
      true,
    );
    expect(shouldContinueLyricsPolling({ lyrics: "Hello", lyrics_sync_status: "synced" })).toBe(
      false,
    );
  });
});

describe("resolveLyricsPollStart", () => {
  it("stamps the current time as the lyrics poll start when polling is still needed and no start is recorded", () => {
    expect(
      resolveLyricsPollStart(undefined, { lyrics: "Hello", lyrics_sync_status: "syncing" }, 5_000),
    ).toBe(5_000);
  });

  it("keeps the already-recorded start time instead of restamping it", () => {
    // If this were restamped on every poll tick (e.g. by reusing the
    // overall track-polling start), the lyrics cutoff would never expire —
    // it must anchor to the first tick lyrics sync was actually pending.
    expect(
      resolveLyricsPollStart(1_000, { lyrics: "Hello", lyrics_sync_status: "syncing" }, 9_000),
    ).toBe(1_000);
  });

  it("does not stamp a start time once lyrics sync has already settled", () => {
    expect(
      resolveLyricsPollStart(undefined, { lyrics: "Hello", lyrics_sync_status: "synced" }, 5_000),
    ).toBeUndefined();
  });
});

describe("shouldStopLyricsPolling", () => {
  it("keeps polling before the max wait has elapsed", () => {
    const start = 1_000;
    expect(shouldStopLyricsPolling(start, start + LYRICS_POLL_MAX_WAIT_MS - 1)).toBe(false);
  });

  it("stops polling once the max wait has elapsed", () => {
    const start = 1_000;
    expect(shouldStopLyricsPolling(start, start + LYRICS_POLL_MAX_WAIT_MS + 1)).toBe(true);
  });
});
