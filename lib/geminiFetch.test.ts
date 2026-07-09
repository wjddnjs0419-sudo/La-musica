import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchGeminiWithRetry } from "./geminiFetch";

const noopSleep = async () => {};

describe("fetchGeminiWithRetry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response immediately on first success", async () => {
    const ok = new Response("{}", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(ok);
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchGeminiWithRetry("https://example.com", {}, { sleep: noopSleep });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 then returns the successful response", async () => {
    const rateLimited = new Response("{}", { status: 429 });
    const ok = new Response("{}", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchGeminiWithRetry("https://example.com", {}, { sleep: noopSleep });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries on repeated 429 and returns the last response", async () => {
    const rateLimited = new Response("{}", { status: 429 });
    const fetchMock = vi.fn().mockResolvedValue(rateLimited);
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchGeminiWithRetry(
      "https://example.com",
      {},
      { sleep: noopSleep, maxRetries: 2 },
    );

    expect(res.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does not retry a non-retryable error status", async () => {
    const badRequest = new Response("{}", { status: 400 });
    const fetchMock = vi.fn().mockResolvedValue(badRequest);
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchGeminiWithRetry("https://example.com", {}, { sleep: noopSleep });

    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("waits according to a Retry-After header before retrying", async () => {
    const rateLimited = new Response("{}", { status: 429, headers: { "retry-after": "2" } });
    const ok = new Response("{}", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(ok);
    vi.stubGlobal("fetch", fetchMock);

    const sleep = vi.fn().mockResolvedValue(undefined);
    await fetchGeminiWithRetry("https://example.com", {}, { sleep });

    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("rethrows after exhausting retries on repeated network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGeminiWithRetry("https://example.com", {}, { sleep: noopSleep, maxRetries: 1 }),
    ).rejects.toThrow("network down");
    expect(fetchMock).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});
