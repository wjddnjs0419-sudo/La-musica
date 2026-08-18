import { describe, it, expect, vi } from "vitest";
import { reconcileMusicRow, type ReconcileDeps, PROCESSING_TIMEOUT_MS } from "./reconcile-music";
import type { Music } from "./music";

function makeMusic(overrides: Partial<Music> = {}): Music {
  return {
    id: "music-1",
    user_id: "user-1",
    status: "processing",
    prompt: "test prompt",
    title: "Test",
    model: "fishaudio/ace-step-1.5",
    audio_url: null,
    audio_key: null,
    cover_url: null,
    cover_key: null,
    thumbnail_url: null,
    thumbnail_key: null,
    thumbnail_prompt: null,
    thumbnail_status: null,
    is_public: false,
    duration_seconds: null,
    error_message: null,
    metadata: { prediction_id: "pred-1" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Music;
}

function makeDeps(overrides: Partial<ReconcileDeps> = {}): ReconcileDeps {
  return {
    getProvider: vi.fn().mockReturnValue({ id: "replicate-ace-step", model: "fishaudio/ace-step-1.5", start: vi.fn(), getStatus: vi.fn().mockResolvedValue({ state: "pending" }) }),
    downloadAudio: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    uploadAudio: vi.fn().mockResolvedValue({ url: "https://cdn/audio.mp3", key: "user-1/music-1.mp3" }),
    getAudioUrl: vi.fn().mockReturnValue("https://cdn/audio.mp3"),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    refundAndMarkFailed: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("reconcileMusicRow", () => {
  it("returns 'pending' when prediction is still processing", async () => {
    const deps = makeDeps();
    const result = await reconcileMusicRow(makeMusic(), deps);
    expect(result.outcome).toBe("pending");
    expect(deps.markCompleted).not.toHaveBeenCalled();
    expect(deps.refundAndMarkFailed).not.toHaveBeenCalled();
  });

  it("copies audio and marks completed when prediction succeeded", async () => {
    const audioUrl = "https://replicate/output.mp3";
    const deps = makeDeps({
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "succeeded", audioUrl }) }),
    });
    const result = await reconcileMusicRow(makeMusic(), deps);
    expect(result.outcome).toBe("completed");
    expect(deps.downloadAudio).toHaveBeenCalledWith(audioUrl);
    expect(deps.uploadAudio).toHaveBeenCalled();
    expect(deps.markCompleted).toHaveBeenCalledWith("music-1", "https://cdn/audio.mp3", "user-1/music-1.mp3");
  });

  it("refunds and marks failed when prediction failed", async () => {
    const deps = makeDeps({
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "failed", error: "OOM" }) }),
    });
    const result = await reconcileMusicRow(makeMusic(), deps);
    expect(result.outcome).toBe("failed");
    expect(deps.refundAndMarkFailed).toHaveBeenCalledWith("music-1", "user-1", expect.stringContaining("OOM"));
    expect(deps.markCompleted).not.toHaveBeenCalled();
  });

  it("refunds and marks failed when prediction canceled", async () => {
    const deps = makeDeps({
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "failed", error: "generation canceled" }) }),
    });
    const result = await reconcileMusicRow(makeMusic(), deps);
    expect(result.outcome).toBe("failed");
    expect(deps.refundAndMarkFailed).toHaveBeenCalled();
  });

  it("skips upload and marks completed when both audio_key and audio_url exist", async () => {
    const music = makeMusic({ audio_key: "user-1/music-1.mp3", audio_url: "https://cdn/audio.mp3" });
    const deps = makeDeps({
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "succeeded", audioUrl: "https://replicate/output.mp3" }) }),
    });
    const result = await reconcileMusicRow(music, deps);
    expect(result.outcome).toBe("completed");
    expect(deps.downloadAudio).not.toHaveBeenCalled();
    expect(deps.uploadAudio).not.toHaveBeenCalled();
    expect(deps.markCompleted).toHaveBeenCalledWith("music-1", "https://cdn/audio.mp3", "user-1/music-1.mp3");
    expect(deps.getAudioUrl).not.toHaveBeenCalled();
  });

  it("skips upload and reconstructs url when only audio_key is set", async () => {
    const music = makeMusic({ audio_key: "user-1/music-1.mp3", audio_url: null });
    const deps = makeDeps({
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "succeeded", audioUrl: "https://replicate/output.mp3" }) }),
      getAudioUrl: vi.fn().mockReturnValue("https://cdn/reconstructed.mp3"),
    });
    const result = await reconcileMusicRow(music, deps);
    expect(result.outcome).toBe("completed");
    expect(deps.downloadAudio).not.toHaveBeenCalled();
    expect(deps.uploadAudio).not.toHaveBeenCalled();
    expect(deps.getAudioUrl).toHaveBeenCalledWith("user-1/music-1.mp3");
    expect(deps.markCompleted).toHaveBeenCalledWith("music-1", "https://cdn/reconstructed.mp3", "user-1/music-1.mp3");
  });

  it("returns 'no_prediction_id' and refunds when prediction_id is missing", async () => {
    const music = makeMusic({ metadata: {} });
    const deps = makeDeps();
    const result = await reconcileMusicRow(music, deps);
    expect(result.outcome).toBe("no_prediction_id");
    expect(deps.refundAndMarkFailed).toHaveBeenCalled();
  });

  it("marks timed-out rows as failed when created_at is beyond timeout", async () => {
    const oldDate = new Date(Date.now() - PROCESSING_TIMEOUT_MS - 1000).toISOString();
    const music = makeMusic({ created_at: oldDate });
    const deps = makeDeps({
      // prediction still "starting" but row is too old
      getProvider: vi.fn().mockReturnValue({ getStatus: vi.fn().mockResolvedValue({ state: "pending" }) }),
    });
    const result = await reconcileMusicRow(music, deps);
    expect(result.outcome).toBe("timed_out");
    expect(deps.refundAndMarkFailed).toHaveBeenCalledWith("music-1", "user-1", expect.stringContaining("timeout"));
  });
});
