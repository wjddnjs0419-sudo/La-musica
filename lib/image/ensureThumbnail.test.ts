import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Music } from "../music";

const downloadThumbnailOutputMock = vi.fn();
vi.mock("./generateThumbnail", () => ({
  downloadThumbnailOutput: (...args: unknown[]) => downloadThumbnailOutputMock(...args),
}));

const { reconcileThumbnailPrediction } = await import("./ensureThumbnail");

function makeMusic(overrides: Partial<Music> = {}): Music {
  return {
    id: "music-1",
    status: "completed",
    thumbnail_url: null,
    thumbnail_key: null,
    thumbnail_prompt: null,
    thumbnail_status: "pending",
    metadata: {},
    ...overrides,
  } as Music;
}

function makeClientStub(uploadResult: { data: unknown; error: unknown }) {
  const updateCalls: { payload: unknown; id: unknown }[] = [];
  const uploadCalls: { key: string }[] = [];

  const client = {
    storage: {
      from: () => ({
        upload: async (key: string) => {
          uploadCalls.push({ key });
          return uploadResult;
        },
      }),
    },
    database: {
      from: () => {
        let payload: unknown;
        const chain = {
          update: (p: unknown) => {
            payload = p;
            return chain;
          },
          eq: (_col: string, id: unknown) => {
            updateCalls.push({ payload, id });
            return chain;
          },
          select: () =>
            Promise.resolve({
              data: [{ ...makeMusic(), ...(payload as object) }],
              error: null,
            }),
        };
        return chain;
      },
    },
  };

  return { client, updateCalls, uploadCalls };
}

beforeEach(() => {
  downloadThumbnailOutputMock.mockReset();
});

describe("reconcileThumbnailPrediction", () => {
  it("persists thumbnail_url/key when the already-started prediction succeeds", async () => {
    const { client, updateCalls, uploadCalls } = makeClientStub({
      data: { url: "https://x/cover.webp", key: "u1/m1-thumbnail-1.webp" },
      error: null,
    });
    downloadThumbnailOutputMock.mockResolvedValue(new Blob());

    await reconcileThumbnailPrediction(client as never, "user-1", makeMusic(), {
      status: "succeeded",
      output: "https://replicate/cover.webp",
    });

    expect(uploadCalls).toHaveLength(1);
    expect(updateCalls[0].payload).toMatchObject({
      thumbnail_url: "https://x/cover.webp",
      thumbnail_key: "u1/m1-thumbnail-1.webp",
      thumbnail_status: "succeeded",
    });
    expect(updateCalls[0].id).toBe("music-1");
  });

  it("marks thumbnail_status failed and persists the provider error", async () => {
    const { client, updateCalls } = makeClientStub({ data: null, error: null });

    await reconcileThumbnailPrediction(client as never, "user-1", makeMusic(), {
      status: "failed",
      error: "replicate_failed",
    });

    expect(updateCalls[0].payload).toMatchObject({
      thumbnail_url: null,
      thumbnail_key: null,
      thumbnail_status: "failed",
      metadata: { thumbnail_error: "replicate_failed" },
    });
  });

  it("leaves an in-progress prediction untouched", async () => {
    const { client, updateCalls, uploadCalls } = makeClientStub({
      data: { url: "https://x/cover.webp", key: "u1/m1-thumbnail-1.webp" },
      error: null,
    });

    const result = await reconcileThumbnailPrediction(client as never, "user-1", makeMusic(), {
      status: "processing",
    });

    expect(result.thumbnail_status).toBe("pending");
    expect(updateCalls).toHaveLength(0);
    expect(uploadCalls).toHaveLength(0);
  });
});
