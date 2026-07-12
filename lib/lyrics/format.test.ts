import { describe, expect, it } from "vitest";
import { lyricDisplayLines } from "./format";

describe("lyricDisplayLines — parenthetical lyrics are never deleted", () => {
  it("keeps a whole-line parenthetical that looks like a stage direction", () => {
    expect(lyricDisplayLines("(Instrumental break)")).toEqual([
      "(Instrumental break)",
    ]);
  });

  it("keeps a parenthetical ad-lib", () => {
    expect(lyricDisplayLines("(oh yeah)")).toEqual(["(oh yeah)"]);
  });

  it("keeps an inline parenthetical attached to a sung line untouched", () => {
    expect(lyricDisplayLines("First line (beat drops)")).toEqual([
      "First line (beat drops)",
    ]);
  });
});

describe("lyricDisplayLines — bracket handling stays conservative", () => {
  it("strips a whole-line canonical section tag", () => {
    expect(lyricDisplayLines("[Verse]\nHello")).toEqual(["Hello"]);
  });

  it("strips a whole-line recognized stage-direction bracket", () => {
    expect(lyricDisplayLines("[Guitar solo]\nHello")).toEqual(["Hello"]);
  });

  it("keeps an unrecognized leading bracket merged with real lyrics", () => {
    expect(lyricDisplayLines("[uh huh] let's go")).toEqual([
      "[uh huh] let's go",
    ]);
  });

  it("strips a canonical tag that shares a line with lyrics", () => {
    expect(lyricDisplayLines("[Chorus] Some lyrics")).toEqual([
      "Some lyrics",
    ]);
  });
});
