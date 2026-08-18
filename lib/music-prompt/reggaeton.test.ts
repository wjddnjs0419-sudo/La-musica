import { describe, expect, it } from "vitest";

import {
  getMatchingReggaetonSimplePreset,
  resolveReggaetonLanguage,
} from "./reggaeton";

describe("Reggaeton sound contract", () => {
  it("defaults automatic lyrics to Spanish", () => {
    expect(resolveReggaetonLanguage("", false)).toBe("Spanish");
  });

  it("preserves user-written lyric language inference", () => {
    expect(resolveReggaetonLanguage("", true)).toBeUndefined();
  });

  it("matches a Simple preset only when its settings still match", () => {
    expect(
      getMatchingReggaetonSimplePreset("perreo", ["sexy"], "club"),
    ).toBe("club_heat");
    expect(
      getMatchingReggaetonSimplePreset("perreo", ["dark"], "club"),
    ).toBe("");
  });
});
