import { expect, it } from "vitest";
import { resolveReggaetonGenerationInput } from "./reggaeton-request";

it("forces Reggaeton and defaults lyric generation to Spanish", () => {
  expect(resolveReggaetonGenerationInput({ style: "perreo", scene: "club", language: "", lyrics: "" })).toEqual({ genre: "reggaeton", style: "perreo", scene: "club", language: "Spanish" });
});
