import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateAutoLyricsForSong } from "./generateAutoLyrics";

function geminiLyricsResponse(lyrics: string) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: "Auto Song",
                  lyrics,
                  hook: "hook line",
                  notes: "auto-generated",
                }),
              },
            ],
          },
        },
      ],
    }),
    { status: 200 },
  );
}

describe("generateAutoLyricsForSong", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it("returns lyrics string when Gemini succeeds", async () => {
    const expectedLyrics = "[Chorus]\nFly away tonight";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiLyricsResponse(expectedLyrics)));

    const result = await generateAutoLyricsForSong({
      prompt: "an uplifting pop song about freedom",
      genre: "pop",
      language: "en",
    });

    expect(result).toBe(expectedLyrics);
  });

  it("passes prompt and context to Gemini", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      geminiLyricsResponse("[Verse]\nsome lyrics"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateAutoLyricsForSong({
      prompt: "a sad ballad",
      genre: "ballad",
      moods: ["melancholic"],
      language: "ko",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const userText = body.contents[0].parts[0].text as string;
    expect(userText).toContain("a sad ballad");
    expect(userText).toContain("ballad");
    expect(userText).toContain("ko");
  });

  it("throws when Gemini returns a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
    );

    await expect(
      generateAutoLyricsForSong({ prompt: "test" }),
    ).rejects.toThrow();
  });

  it("throws when Gemini returns unparseable output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "not json" }] } }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      generateAutoLyricsForSong({ prompt: "test" }),
    ).rejects.toThrow();
  });
});
