import { describe, it, expect } from "vitest";
import { sanitizeReferences } from "./sanitizeReferences";

describe("sanitizeReferences", () => {
  it("replaces Bad Bunny with generic descriptors", () => {
    const out = sanitizeReferences("Bad Bunny style fast reggaeton");
    expect(out.toLowerCase()).not.toContain("bad bunny");
    expect(out).toContain("Latin urban");
  });

  it("replaces 임창정", () => {
    const out = sanitizeReferences("임창정 느낌 발라드");
    expect(out).not.toContain("임창정");
    expect(out).toContain("Korean karaoke ballad");
  });

  it("strips risky phrasing", () => {
    const out = sanitizeReferences("make it exactly like this, 똑같이 그대로");
    expect(out.toLowerCase()).not.toContain("exactly like");
    expect(out).not.toContain("똑같이");
    expect(out).not.toContain("그대로");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeReferences("")).toBe("");
  });
});
