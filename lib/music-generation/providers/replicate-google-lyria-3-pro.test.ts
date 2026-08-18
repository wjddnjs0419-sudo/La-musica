import { describe, expect, it } from "vitest";

import {
  buildLyria3ProPrompt,
  normalizeLyria3ProStatus,
} from "./replicate-google-lyria-3-pro";

describe("Replicate Google Lyria 3 Pro provider", () => {
  it("combines music direction and sectioned lyrics into Lyria's prompt input", () => {
    expect(
      buildLyria3ProPrompt({
        prompt: "dreamy indie pop, 110 BPM",
        lyrics: "[Verse]\nNeon lights",
        instrumental: false,
        duration: 120,
      }),
    ).toBe(
      "Create an original vocal song using the supplied lyrics.\nTarget duration: about 120 seconds.\n\nMusic direction:\ndreamy indie pop, 110 BPM\n\nLyrics:\n[Verse]\nNeon lights",
    );
  });

  it("marks a Replicate file output as completed", () => {
    expect(
      normalizeLyria3ProStatus({
        status: "succeeded",
        output: { url: () => "https://replicate.delivery/song.mp3" },
      }),
    ).toEqual({
      state: "succeeded",
      audioUrl: "https://replicate.delivery/song.mp3",
    });
  });
});
