import { describe, expect, it } from "vitest";
import {
  getActiveMusicGenerationProvider,
  getMusicGenerationProvider,
} from "./provider";

describe("getMusicGenerationProvider", () => {
  it("returns null for an unregistered provider", () => {
    expect(getMusicGenerationProvider("unknown")).toBeNull();
  });

  it("uses Lyria 3 Pro for new generations while retaining ACE-Step lookup", () => {
    expect(getActiveMusicGenerationProvider()).toMatchObject({
      id: "replicate-google-lyria-3-pro",
      model: "google/lyria-3-pro",
    });
    expect(getMusicGenerationProvider("replicate-ace-step")).not.toBeNull();
  });
});
