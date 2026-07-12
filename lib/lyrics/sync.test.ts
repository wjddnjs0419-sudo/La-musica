import { describe, expect, it } from "vitest";

import {
  buildInitialLyricsSyncMetadata,
  buildLrcFromTimedMatches,
  deriveLyricsSyncStatus,
  getLyricsSyncStatus,
  LYRICS_POLL_MAX_WAIT_MS,
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
