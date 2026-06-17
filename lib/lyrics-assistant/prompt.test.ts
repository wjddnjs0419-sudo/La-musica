import { describe, it, expect } from "vitest";
import { LYRICS_SYSTEM_PROMPT } from "./prompt";
import { CANONICAL_SECTION_TAGS } from "../music-prompt/buildLyricsPayload";

describe("LYRICS_SYSTEM_PROMPT section tags", () => {
  it("only advertises tags the lyrics normalizer recognizes", () => {
    const advertised = LYRICS_SYSTEM_PROMPT.match(/\[[^\]]+\]/g) ?? [];
    const unknown = advertised.filter((t) => !CANONICAL_SECTION_TAGS.includes(t));
    expect(unknown).toEqual([]);
  });
});
