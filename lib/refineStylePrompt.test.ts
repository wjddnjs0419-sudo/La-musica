import { describe, it, expect } from "vitest";
import { finalizeRefined } from "./refineStylePrompt";
import { COPYRIGHT_LINE } from "./music-prompt/buildMusicPrompt";

const FALLBACK = `festival big-room edm, ${COPYRIGHT_LINE}`;

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

  it("clamps to 2000 chars with the copyright clause intact", () => {
    const refined = "a".repeat(3000);
    const out = finalizeRefined(refined, FALLBACK);
    expect(out.length).toBeLessThanOrEqual(2000);
    expect(out.endsWith(COPYRIGHT_LINE)).toBe(true);
  });
});
