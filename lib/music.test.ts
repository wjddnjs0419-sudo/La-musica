import { describe, it, expect } from "vitest";
import { resolveRenameTitle, buildAceStepInput, ACE_STEP_DURATION_SECONDS } from "./music";

describe("resolveRenameTitle", () => {
  it("returns the trimmed title when it is a real change", () => {
    expect(resolveRenameTitle("  New Name  ", "Old")).toBe("New Name");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(resolveRenameTitle("", "Old")).toBeNull();
    expect(resolveRenameTitle("   ", "Old")).toBeNull();
  });

  it("returns null when the trimmed title equals the current title", () => {
    expect(resolveRenameTitle("Old", "Old")).toBeNull();
    expect(resolveRenameTitle("  Old  ", "Old")).toBeNull();
  });
});

describe("buildAceStepInput", () => {
  it("sends the trimmed prompt, lyrics, default duration, and mp3 format for a vocal track", () => {
    const result = buildAceStepInput({
      prompt: "  upbeat synth pop  ",
      lyrics: "[Verse]\nwalking down the street",
    });
    expect(result).toEqual({
      prompt: "upbeat synth pop",
      lyrics: "[Verse]\nwalking down the street",
      duration: ACE_STEP_DURATION_SECONDS,
      audio_format: "mp3",
    });
  });

  it("sends the literal [Instrumental] lyrics value when instrumental is true", () => {
    const result = buildAceStepInput({
      prompt: "festival big-room edm",
      lyrics: "[Verse]\nthis should be ignored",
      instrumental: true,
    });
    expect(result.lyrics).toBe("[Instrumental]");
  });

  it("sends [Instrumental] when lyrics is missing even if instrumental is false", () => {
    const result = buildAceStepInput({
      prompt: "festival big-room edm",
      instrumental: false,
    });
    expect(result.lyrics).toBe("[Instrumental]");
  });

  it("clamps prompt to 500 chars and lyrics to 3500 chars", () => {
    const result = buildAceStepInput({
      prompt: "a".repeat(600),
      lyrics: `[Verse]\n${"b".repeat(4000)}`,
    });
    expect(result.prompt.length).toBe(500);
    expect(result.lyrics.length).toBe(3500);
  });

  it("uses ACE_STEP_DURATION_SECONDS when no duration is supplied", () => {
    const result = buildAceStepInput({ prompt: "test" });
    expect(result.duration).toBe(ACE_STEP_DURATION_SECONDS);
  });

  it("uses the supplied duration instead of the default", () => {
    const result = buildAceStepInput({ prompt: "test", duration: 60 });
    expect(result.duration).toBe(60);
  });
});
