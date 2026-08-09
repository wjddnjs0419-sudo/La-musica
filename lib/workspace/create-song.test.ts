import { describe, expect, it } from "vitest";

import {
  buildCreateSongRequest,
  toggleMoodSelection,
  type CreateSongFormState,
} from "./create-song";

const baseState: CreateSongFormState = {
  prompt: "  Warm electronic pop with a sunrise chorus  ",
  lyrics: "  Keep the lights on  ",
  genre: "edm",
  moods: ["energetic", "epic"],
  useCase: "workout",
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
      genre: "edm",
      moods: ["energetic", "epic"],
      useCase: "workout",
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
});

describe("toggleMoodSelection", () => {
  it("does not add a fourth mood", () => {
    expect(toggleMoodSelection(["hard", "dark", "epic"], "happy")).toEqual([
      "hard",
      "dark",
      "epic",
    ]);
  });

  it("removes a selected mood even when the limit is reached", () => {
    expect(toggleMoodSelection(["hard", "dark", "epic"], "dark")).toEqual([
      "hard",
      "epic",
    ]);
  });
});
