import { describe, expect, it } from "vitest";
import { getMusicGenerationProvider } from "./provider";

describe("getMusicGenerationProvider", () => {
  it("returns null for an unregistered provider", () => {
    expect(getMusicGenerationProvider("unknown")).toBeNull();
  });
});
