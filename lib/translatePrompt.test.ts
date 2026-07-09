import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { shouldTranslate, translateToEnglish } from "./translatePrompt";

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 },
  );
}

describe("shouldTranslate", () => {
  it("returns false for an empty string", () => {
    expect(shouldTranslate("")).toBe(false);
  });

  it("returns false for whitespace only", () => {
    expect(shouldTranslate("   \n\t ")).toBe(false);
  });

  it("returns false for pure-ASCII English text", () => {
    expect(shouldTranslate("hard EDM for workout")).toBe(false);
  });

  it("returns true for Korean text", () => {
    expect(shouldTranslate("운동할 때 듣는 강한 EDM")).toBe(true);
  });

  it("returns true for accented Latin text (Spanish)", () => {
    expect(shouldTranslate("una canción romántica")).toBe(true);
  });
});

describe("translateToEnglish", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("retries after a 429 rate limit and returns the translated text", async () => {
    const rateLimited = new Response("{}", { status: 429 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(geminiResponse("hard EDM for workout"));
    vi.stubGlobal("fetch", fetchMock);

    const out = await translateToEnglish("운동할 때 듣는 강한 EDM");

    expect(out).toBe("hard EDM for workout");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
