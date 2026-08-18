import { describe, expect, it } from "vitest";

import {
  buildCreateSongRequest,
  canContinueFromSound,
  toggleMoodSelection,
  type CreateSongFormState,
} from "./create-song";

const baseState: CreateSongFormState = {
  prompt: "  Warm electronic pop with a sunrise chorus  ",
  lyrics: "  Keep the lights on  ",
  style: "perreo",
  scene: "club",
  simplePreset: "club_heat",
  moods: ["energetic", "epic"],
  vocalMode: "female_vocal",
  language: "English",
  duration: 180,
  soundDirection: "",
};

describe("buildCreateSongRequest", () => {
  it("trims and forwards the existing generation fields", () => {
    expect(buildCreateSongRequest(baseState)).toEqual({
      prompt: "Warm electronic pop with a sunrise chorus",
      lyrics: "Keep the lights on",
      instrumental: false,
      genre: "reggaeton",
      style: "perreo",
      scene: "club",
      moods: ["energetic", "epic"],
      vocalMode: "female_vocal",
      language: "English",
      duration: 180,
    });
  });

  it("preserves written lyrics while marking an instrumental request", () => {
    expect(
      buildCreateSongRequest({
        ...baseState,
        lyrics: "Keep this draft for later",
        vocalMode: "instrumental",
      }),
    ).toMatchObject({
      lyrics: "Keep this draft for later",
      instrumental: true,
    });
  });

  it("adds optional sound direction to the generation prompt", () => {
    expect(
      buildCreateSongRequest({
        ...baseState,
        soundDirection: "warm piano, soft drums",
      }).prompt,
    ).toBe("Warm electronic pop with a sunrise chorus. warm piano, soft drums");
  });

  it("creates a compiler seed when a Simple preset has no free text", () => {
    expect(buildCreateSongRequest({ ...baseState, prompt: "", soundDirection: "" }).prompt).toBe("Reggaeton track");
  });
});

describe("Reggaeton Simple validation", () => {
  it("requires either a description or a preset", () => {
    expect(canContinueFromSound({ ...baseState, prompt: "", simplePreset: "" } as never, "simple")).toBe(false);
    expect(canContinueFromSound({ ...baseState, prompt: "", simplePreset: "club_heat" } as never, "simple")).toBe(true);
  });
});

describe("toggleMoodSelection", () => {
  it("allows multiple Reggaeton moods", () => {
    expect(toggleMoodSelection(["hard", "dark", "epic"], "happy")).toEqual([
      "hard",
      "dark",
      "epic",
      "happy",
    ]);
  });

  it("removes a selected mood even when the limit is reached", () => {
    expect(toggleMoodSelection(["hard", "dark", "epic"], "dark")).toEqual([
      "hard",
      "epic",
    ]);
  });
});
