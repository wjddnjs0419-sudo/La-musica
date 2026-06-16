import { describe, it, expect } from "vitest";
import {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  REFERENCE_MAP,
  resolveVocalMode,
} from "./presets";

describe("presets", () => {
  it("has a preset for every concrete genre", () => {
    for (const g of ["edm", "reggaeton", "hiphop_trap", "techno", "korean_ballad", "brazilian_funk", "afropop_festival", "french_maghreb_hiphop", "football_chant"] as const) {
      expect(GENRE_PRESETS[g].length).toBeGreaterThan(20);
    }
  });

  it("edm preset mentions a drop and kick", () => {
    expect(GENRE_PRESETS.edm).toContain("drop");
    expect(GENRE_PRESETS.edm).toContain("kick");
  });

  it("has mood/use-case/vocal presets", () => {
    expect(MOOD_PRESETS.hard).toContain("aggressive");
    expect(USE_CASE_PRESETS.workout).toContain("physical momentum");
    expect(VOCAL_PRESETS.male_vocal).toContain("male vocal");
  });

  it("reference map covers Bad Bunny", () => {
    // REFERENCE_MAP regexes are global/stateful; never call .test() on the
    // shared object (its lastIndex advances). Test via a fresh regex.
    const hit = REFERENCE_MAP.find(([re]) =>
      new RegExp(re.source, re.flags).test("bad bunny style"),
    );
    expect(hit?.[1]).toContain("Latin urban");
  });

  it("resolveVocalMode: explicit wins", () => {
    expect(resolveVocalMode({ userDescription: "x", vocalMode: "female_vocal" })).toBe("female_vocal");
  });

  it("resolveVocalMode: auto with lyrics -> male_vocal", () => {
    expect(resolveVocalMode({ userDescription: "x", vocalMode: "auto", lyrics: "[Verse] hi" })).toBe("male_vocal");
  });

  it("resolveVocalMode: auto edm -> instrumental", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "edm" })).toBe("instrumental");
  });

  it("resolveVocalMode: auto hiphop -> rap_vocal", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "hiphop_trap" })).toBe("rap_vocal");
  });

  it("resolveVocalMode: auto football -> crowd_chant", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "football_chant" })).toBe("crowd_chant");
  });

  it("resolveVocalMode: bogus mode falls through to auto -> instrumental", () => {
    expect(
      resolveVocalMode({ userDescription: "x", vocalMode: "shouting" as never, genre: "edm" }),
    ).toBe("instrumental");
  });

  it("resolveVocalMode: known concrete mode still wins", () => {
    expect(resolveVocalMode({ userDescription: "x", vocalMode: "female_vocal" })).toBe("female_vocal");
  });
});
