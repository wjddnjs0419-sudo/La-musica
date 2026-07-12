import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Music } from "../music";

// `after()` is fire-and-forget by design, so ensureLyricsSyncStarted never
// awaits it. Tests that need to observe the scheduled work's outcome must
// explicitly wait for it via `waitForAfter()` below.
let pendingAfter: Promise<unknown> = Promise.resolve();
const afterSpy = vi.fn((cb: () => unknown) => {
  pendingAfter = Promise.resolve().then(cb);
});
vi.mock("next/server", () => ({
  after: (cb: () => unknown) => afterSpy(cb),
}));

async function waitForAfter() {
  await pendingAfter;
}

const generateLyricsLrcFromAudioMock = vi.fn();
vi.mock("./sync", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sync")>();
  return {
    ...actual,
    generateLyricsLrcFromAudio: (...args: unknown[]) =>
      generateLyricsLrcFromAudioMock(...args),
  };
});

const { ensureLyricsSyncStarted } = await import("./ensureLyricsSync");

const NOW = new Date("2026-07-12T00:00:00.000Z").getTime();

function makeMusic(overrides: Partial<Music> = {}): Music {
  return {
    id: "music-1",
    status: "completed",
    audio_url: "https://example.com/a.mp3",
    audio_key: "key",
    duration_seconds: 120,
    metadata: {},
    ...overrides,
  } as Music;
}

type QueryOp = { method: string; args: unknown[] };
type QueuedResult = { data: unknown; error: unknown };

function makeAdminStub(queue: QueuedResult[]) {
  const calls: { ops: QueryOp[] }[] = [];

  const from = () => {
    const ops: QueryOp[] = [];
    const chain = {
      update: (...args: unknown[]) => {
        ops.push({ method: "update", args });
        return chain;
      },
      select: (...args: unknown[]) => {
        ops.push({ method: "select", args });
        return chain;
      },
      eq: (...args: unknown[]) => {
        ops.push({ method: "eq", args });
        return chain;
      },
      is: (...args: unknown[]) => {
        ops.push({ method: "is", args });
        return chain;
      },
      maybeSingle: async () => {
        calls.push({ ops });
        return queue.shift() ?? { data: null, error: null };
      },
    };
    return chain;
  };

  return { admin: { database: { from } } as never, calls };
}

function statusGuard(ops: QueryOp[]) {
  return ops.find(
    (op) => op.method === "eq" && op.args[0] === "metadata->>lyrics_sync_status",
  );
}

beforeEach(() => {
  afterSpy.mockClear();
  generateLyricsLrcFromAudioMock.mockReset();
});

describe("ensureLyricsSyncStarted — no-ops", () => {
  it("returns music unchanged when status is not completed", async () => {
    const { admin, calls } = makeAdminStub([]);
    const music = makeMusic({ status: "processing" });
    const result = await ensureLyricsSyncStarted(admin, music, NOW);
    expect(result).toBe(music);
    expect(calls).toHaveLength(0);
  });

  it("returns music unchanged when audio_url is missing", async () => {
    const { admin, calls } = makeAdminStub([]);
    const music = makeMusic({ audio_url: null });
    const result = await ensureLyricsSyncStarted(admin, music, NOW);
    expect(result).toBe(music);
    expect(calls).toHaveLength(0);
  });
});

describe("ensureLyricsSyncStarted — pending -> syncing CAS transition", () => {
  it("guards the write on the observed explicit status and schedules background sync via after()", async () => {
    const syncingRow = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "syncing" },
    });
    const { admin, calls } = makeAdminStub([
      { data: syncingRow, error: null }, // pending -> syncing write
      { data: syncingRow, error: null }, // updateMusicMetadata's read
      {
        data: {
          ...syncingRow,
          metadata: { ...syncingRow.metadata, lyrics_sync_status: "synced" },
        },
        error: null,
      }, // finalize write
    ]);
    generateLyricsLrcFromAudioMock.mockResolvedValue({
      lrc: "[00:01.00]hi",
      model: "gemini-2.5-flash",
    });

    const music = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "pending" },
    });
    const result = await ensureLyricsSyncStarted(admin, music, NOW);
    await waitForAfter();

    expect(result.metadata.lyrics_sync_status).toBe("syncing");
    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(generateLyricsLrcFromAudioMock).toHaveBeenCalledTimes(1);

    expect(statusGuard(calls[0].ops)?.args[1]).toBe("pending");
    expect(statusGuard(calls[2].ops)?.args[1]).toBe("syncing");
  });

  it("guards with an IS NULL check when no explicit status exists yet (legacy row)", async () => {
    const syncingRow = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "syncing" },
    });
    const { admin, calls } = makeAdminStub([{ data: syncingRow, error: null }]);
    generateLyricsLrcFromAudioMock.mockResolvedValue({
      lrc: "[00:01.00]hi",
      model: "gemini-2.5-flash",
    });

    const music = makeMusic({ metadata: { lyrics: "hi" } }); // no lyrics_sync_status key
    await ensureLyricsSyncStarted(admin, music, NOW);
    await waitForAfter();

    const isCall = calls[0].ops.find((op) => op.method === "is");
    expect(isCall?.args).toEqual(["metadata->lyrics_sync_status", null]);
  });

  it("does not start a duplicate sync when another process already claimed the row", async () => {
    const { admin, calls } = makeAdminStub([{ data: null, error: null }]);
    const music = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "pending" },
    });
    const result = await ensureLyricsSyncStarted(admin, music, NOW);

    expect(result).toBe(music);
    expect(afterSpy).not.toHaveBeenCalled();
    expect(generateLyricsLrcFromAudioMock).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });
});

describe("ensureLyricsSyncStarted — stale 'syncing' recovery", () => {
  it("retries a 'syncing' row whose started_at is older than the staleness threshold", async () => {
    const staleStartedAt = new Date(NOW - 10 * 60 * 1000).toISOString();
    const syncingRow = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "syncing" },
    });
    const { admin, calls } = makeAdminStub([{ data: syncingRow, error: null }]);
    generateLyricsLrcFromAudioMock.mockResolvedValue({
      lrc: "[00:01.00]hi",
      model: "gemini-2.5-flash",
    });

    const music = makeMusic({
      metadata: {
        lyrics: "hi",
        lyrics_sync_status: "syncing",
        lyrics_sync_started_at: staleStartedAt,
      },
    });
    await ensureLyricsSyncStarted(admin, music, NOW);
    await waitForAfter();

    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(statusGuard(calls[0].ops)?.args[1]).toBe("syncing");
  });

  it("does not retry a 'syncing' row that is not yet stale", async () => {
    const recentStartedAt = new Date(NOW - 30 * 1000).toISOString();
    const { admin, calls } = makeAdminStub([]);
    const music = makeMusic({
      metadata: {
        lyrics: "hi",
        lyrics_sync_status: "syncing",
        lyrics_sync_started_at: recentStartedAt,
      },
    });
    const result = await ensureLyricsSyncStarted(admin, music, NOW);

    expect(result).toBe(music);
    expect(calls).toHaveLength(0);
    expect(afterSpy).not.toHaveBeenCalled();
  });
});

describe("ensureLyricsSyncStarted — background outcome writes", () => {
  it("writes skipped status when there is no lyrics text to sync", async () => {
    const syncingRow = makeMusic({
      metadata: { lyrics_sync_status: "syncing", instrumental: true },
    });
    const { admin } = makeAdminStub([
      { data: syncingRow, error: null }, // pending -> syncing write
      { data: syncingRow, error: null }, // updateMusicMetadata read
      {
        data: { ...syncingRow, metadata: { ...syncingRow.metadata, lyrics_sync_status: "skipped" } },
        error: null,
      },
    ]);

    const music = makeMusic({
      metadata: { lyrics_sync_status: "pending", instrumental: true },
    });
    await ensureLyricsSyncStarted(admin, music, NOW);
    await waitForAfter();

    expect(generateLyricsLrcFromAudioMock).not.toHaveBeenCalled();
  });

  it("writes failed status with the error message when Gemini alignment throws", async () => {
    const syncingRow = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "syncing" },
    });
    let finalizeMetadata: Record<string, unknown> | undefined;
    generateLyricsLrcFromAudioMock.mockRejectedValue(new Error("gemini_failed"));

    const music = makeMusic({
      metadata: { lyrics: "hi", lyrics_sync_status: "pending" },
    });
    // Records the metadata payload passed to each update() call so the
    // final (failed-status) write can be inspected directly.
    const recordingAdmin = {
      database: {
        from: () => {
          let updatePayload: { metadata: Record<string, unknown> } | undefined;
          const chain = {
            update: (payload: { metadata: Record<string, unknown> }) => {
              updatePayload = payload;
              return chain;
            },
            select: () => chain,
            eq: () => chain,
            is: () => chain,
            maybeSingle: async () => {
              finalizeMetadata = updatePayload?.metadata ?? finalizeMetadata;
              if (!finalizeMetadata) return { data: syncingRow, error: null };
              return { data: { ...syncingRow, metadata: finalizeMetadata }, error: null };
            },
          };
          return chain;
        },
      },
    } as never;

    await ensureLyricsSyncStarted(recordingAdmin, music, NOW);
    await waitForAfter();

    expect(finalizeMetadata?.lyrics_sync_status).toBe("failed");
    expect(finalizeMetadata?.lyrics_sync_error).toBe("gemini_failed");
  });
});
