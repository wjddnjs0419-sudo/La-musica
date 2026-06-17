import { describe, expect, it } from "vitest";

import {
  buildFallbackMusicTitle,
  deriveTitleFromLyrics,
  sanitizeGeneratedTitle,
} from "./musicTitle";

describe("music title helpers", () => {
  it("prefers the first hook line when deriving a lyrics fallback title", () => {
    expect(
      deriveTitleFromLyrics([
        "[Verse]",
        "Walking past the station",
        "[Chorus]",
        "Only Tonight",
        "We burn brighter than the skyline",
      ].join("\n")),
    ).toBe("Only Tonight");
  });

  it("uses genre and mood for instrumental fallback titles", () => {
    expect(
      buildFallbackMusicTitle({
        lyrics: "[Chorus]\nOnly Tonight",
        instrumental: true,
        genre: "techno",
        moods: ["dark"],
      }),
    ).toBe("Dark Techno Instrumental");
  });

  it("uses genre and mood for lyricless vocal fallback titles", () => {
    expect(
      buildFallbackMusicTitle({
        instrumental: false,
        genre: "korean_ballad",
        moods: ["romantic"],
      }),
    ).toBe("Romantic Korean Ballad Track");
  });

  it("sanitizes model title output and rejects generic titles", () => {
    expect(sanitizeGeneratedTitle('Song Title: "Only Tonight"', "Fallback")).toBe(
      "Only Tonight",
    );
    expect(sanitizeGeneratedTitle("Untitled", "Fallback")).toBe("Fallback");
  });
});
