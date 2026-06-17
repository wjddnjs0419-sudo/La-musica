import { describe, it, expect } from "vitest";
import { resolveRenameTitle } from "./music";

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
