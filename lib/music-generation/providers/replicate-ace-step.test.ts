import { describe, expect, it } from "vitest";
import {
  buildAceStepInput,
  normalizeReplicateStatus,
} from "./replicate-ace-step";

describe("replicate ACE-Step provider", () => {
  it("uses ACE-Step's instrumental input contract", () => {
    expect(buildAceStepInput({ prompt: "x", instrumental: true })).toEqual({
      prompt: "x",
      lyrics: "[Instrumental]",
      duration: 180,
      audio_format: "mp3",
    });
  });

  it("normalizes successful array output", () => {
    expect(normalizeReplicateStatus({ status: "succeeded", output: ["https://audio"] })).toEqual({
      state: "succeeded",
      audioUrl: "https://audio",
    });
  });

  it("normalizes cancellation to a failed generation", () => {
    expect(normalizeReplicateStatus({ status: "canceled" })).toEqual({
      state: "failed",
      error: "generation canceled",
    });
  });
});
