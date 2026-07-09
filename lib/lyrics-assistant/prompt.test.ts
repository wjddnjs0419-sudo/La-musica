import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LYRICS_SYSTEM_PROMPT, generateLyrics } from "./prompt";
import { CANONICAL_SECTION_TAGS } from "../music-prompt/buildLyricsPayload";

describe("LYRICS_SYSTEM_PROMPT section tags", () => {
  it("only advertises tags the lyrics normalizer recognizes", () => {
    const advertised = LYRICS_SYSTEM_PROMPT.match(/\[[^\]]+\]/g) ?? [];
    const unknown = advertised.filter((t) => !CANONICAL_SECTION_TAGS.includes(t));
    expect(unknown).toEqual([]);
  });
});

function geminiLyricsResponse(result: {
  title: string;
  lyrics: string;
  hook: string;
  notes: string;
}) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
    }),
    { status: 200 },
  );
}

describe("generateLyrics", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const result = {
    title: "Only Tonight",
    lyrics: "[Chorus]\nOnly tonight",
    hook: "Only tonight",
    notes: "Wrote a chorus.",
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("retries after a 429 rate limit and returns the structured lyrics", async () => {
    const rateLimited = new Response("{}", { status: 429 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(geminiLyricsResponse(result));
    vi.stubGlobal("fetch", fetchMock);

    const out = await generateLyrics([{ role: "user", content: "write a chorus" }], undefined, undefined);

    expect(out).toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
