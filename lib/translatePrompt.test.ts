import { describe, it, expect } from "vitest";
import { shouldTranslate } from "./translatePrompt";

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
