import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { finalizeRefined, refineStylePrompt } from "./refineStylePrompt";
import { COPYRIGHT_LINE } from "./music-prompt/buildMusicPrompt";

const FALLBACK = `festival big-room edm, ${COPYRIGHT_LINE}`;

function geminiResponse(text: string) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 },
  );
}

describe("finalizeRefined", () => {
  it("returns the fallback when refined text is empty or whitespace", () => {
    expect(finalizeRefined("", FALLBACK)).toBe(FALLBACK);
    expect(finalizeRefined("   \n  ", FALLBACK)).toBe(FALLBACK);
  });

  it("appends the copyright clause when the model dropped it", () => {
    const refined = "festival big-room edm, 128 bpm, supersaw lead";
    const out = finalizeRefined(refined, FALLBACK);
    expect(out).toContain(COPYRIGHT_LINE);
    expect(out.startsWith(refined)).toBe(true);
  });

  it("does not duplicate the copyright clause when already present", () => {
    const refined = `festival big-room edm, ${COPYRIGHT_LINE}`;
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.split(COPYRIGHT_LINE).length - 1).toBe(1);
  });

  it("clamps to 500 chars with the copyright clause intact", () => {
    const refined = "a".repeat(3000);
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith(COPYRIGHT_LINE)).toBe(true);
  });

  it("strips a paraphrased copyright tail and appends the canon clause once", () => {
    // Gemini paraphrases the copyright instruction instead of echoing it verbatim,
    // then the canon clause gets re-appended → duplicated tail (observed in prod).
    const refined =
      "reggaeton, 808 bass, dembow groove, original composition, do not imitate, no copyright., do not imitate any artist or track.";
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.split(COPYRIGHT_LINE).length - 1).toBe(1);
    expect(out.endsWith(COPYRIGHT_LINE)).toBe(true);
    expect(out).toContain("dembow groove");
    // No paraphrased copyright fragments survive before the canon clause.
    const body = out.slice(0, out.length - COPYRIGHT_LINE.length);
    expect(body).not.toMatch(/imitate|copyright|original composition/i);
  });

  it("removes a verbatim canon clause embedded mid-text without leaving orphan fragments", () => {
    const refined = `reggaeton, 808 bass, ${COPYRIGHT_LINE} late-night perreo`;
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.split(COPYRIGHT_LINE).length - 1).toBe(1);
    expect(out).toContain("late-night perreo");
    // The canon clause itself contains "song, melody"; assert only the body
    // before it carries no orphan fragments from the embedded canon line.
    const body = out.slice(0, out.length - COPYRIGHT_LINE.length);
    expect(body).not.toMatch(/\bsong\b|\bmelody\b/);
  });

  it("falls back when stripping leaves no musical content", () => {
    expect(finalizeRefined("original composition, do not imitate", FALLBACK)).toBe(
      FALLBACK,
    );
  });
});

describe("refineStylePrompt", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const compiled = `festival big-room edm, ${COPYRIGHT_LINE}`;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("retries after a 429 rate limit and returns the refined prompt", async () => {
    const rateLimited = new Response("{}", { status: 429 });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(rateLimited)
      .mockResolvedValueOnce(geminiResponse(`festival big-room edm, 128 bpm, ${COPYRIGHT_LINE}`));
    vi.stubGlobal("fetch", fetchMock);

    const out = await refineStylePrompt(compiled, false, {
      modelLabel: "Test model",
      maxPromptChars: 500,
      targetChars: 400,
    });

    expect(out).toContain("128 bpm");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
