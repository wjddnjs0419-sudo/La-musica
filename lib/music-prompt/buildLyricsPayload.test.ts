import { describe, it, expect } from "vitest";
import { buildLyricsPayload } from "./buildLyricsPayload";

describe("buildLyricsPayload", () => {
  it("returns undefined for instrumental", () => {
    expect(
      buildLyricsPayload({ userDescription: "edm", vocalMode: "instrumental" }, "instrumental"),
    ).toBeUndefined();
  });

  it("returns undefined when vocal but no lyrics", () => {
    expect(
      buildLyricsPayload({ userDescription: "ballad", vocalMode: "male_vocal" }, "male_vocal"),
    ).toBeUndefined();
  });

  it("normalizes tag casing", () => {
    const out = buildLyricsPayload(
      { userDescription: "x", vocalMode: "male_vocal", lyrics: "[verse]\nhello\n[CHORUS]\nworld" },
      "male_vocal",
    );
    expect(out).toContain("[Verse]");
    expect(out).toContain("[Chorus]");
    expect(out).not.toContain("[verse]");
  });

  it("wraps unstructured lyrics in a Verse tag", () => {
    const out = buildLyricsPayload(
      { userDescription: "x", vocalMode: "male_vocal", lyrics: "just some words" },
      "male_vocal",
    );
    expect(out).toContain("[Verse]");
    expect(out).toContain("just some words");
  });

  it("removes instrumental stage directions before sending lyrics to the model", () => {
    const out = buildLyricsPayload(
      {
        userDescription: "x",
        vocalMode: "male_vocal",
        lyrics: "[Verse]\n(Instrumental break)\nSing this line (beat drops)\n(oh yeah)\n[Guitar solo]",
      },
      "male_vocal",
    );
    expect(out).toContain("Sing this line");
    expect(out).toContain("(oh yeah)");
    expect(out).not.toContain("Instrumental break");
    expect(out).not.toContain("beat drops");
    expect(out).not.toContain("Guitar solo");
  });
});
