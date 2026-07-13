import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Music } from "../music";

// `after()` is fire-and-forget by design, so scheduleThumbnailGeneration never
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

const generateThumbnailMock = vi.fn();
vi.mock("./generateThumbnail", () => ({
  generateThumbnail: (...args: unknown[]) => generateThumbnailMock(...args),
}));

const { scheduleThumbnailGeneration } = await import("./ensureThumbnail");

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
  afterSpy.mockClear();
  generateThumbnailMock.mockReset();
});

describe("scheduleThumbnailGeneration", () => {
  it("schedules the work via after() instead of running it inline", () => {
    const { client } = makeClientStub({ data: { url: "u", key: "k" }, error: null });
    generateThumbnailMock.mockResolvedValue(new Blob());

    scheduleThumbnailGeneration(client as never, "user-1", makeMusic(), "a prompt");

    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(generateThumbnailMock).not.toHaveBeenCalled();
  });

  it("persists thumbnail_url/key and succeeded status once the scheduled work completes", async () => {
    const { client, updateCalls, uploadCalls } = makeClientStub({
      data: { url: "https://x/cover.webp", key: "u1/m1-thumbnail-1.webp" },
      error: null,
    });
    generateThumbnailMock.mockResolvedValue(new Blob());

    scheduleThumbnailGeneration(client as never, "user-1", makeMusic(), "a prompt");
    await waitForAfter();

    expect(uploadCalls).toHaveLength(1);
    expect(updateCalls[0].payload).toMatchObject({
      thumbnail_url: "https://x/cover.webp",
      thumbnail_key: "u1/m1-thumbnail-1.webp",
      thumbnail_status: "succeeded",
    });
    expect(updateCalls[0].id).toBe("music-1");
  });

  it("marks thumbnail_status failed when generation throws, instead of leaving it pending", async () => {
    const { client, updateCalls } = makeClientStub({ data: null, error: null });
    generateThumbnailMock.mockRejectedValue(new Error("replicate_failed"));

    scheduleThumbnailGeneration(client as never, "user-1", makeMusic(), "a prompt");
    await waitForAfter();

    expect(updateCalls[0].payload).toMatchObject({
      thumbnail_url: null,
      thumbnail_key: null,
      thumbnail_status: "failed",
    });
  });
});
