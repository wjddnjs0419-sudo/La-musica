import { describe, expect, it } from "vitest";

import { buildThumbnailPrompt } from "./buildThumbnailPrompt";

describe("buildThumbnailPrompt", () => {
  it("never contains newline characters (Replicate's flux-schnell model fails predictions with 'Director: unexpected error handling prediction' on multi-line prompts, confirmed by direct repro)", () => {
    const prompt = buildThumbnailPrompt({ title: "Test Song" });
    expect(prompt).not.toMatch(/\n/);
  });

  it("builds the prompt from the title alone", () => {
    const prompt = buildThumbnailPrompt({ title: "Neon Nights" });
    expect(prompt).toContain("Neon Nights");
  });

  it("falls back to a generic concept for an empty title", () => {
    const prompt = buildThumbnailPrompt({ title: "   " });
    expect(prompt).toContain("Untitled Track");
  });
});
