import { describe, expect, it } from "vitest";
import { resolveLandingHeaderActions } from "./landing-auth";

describe("resolveLandingHeaderActions", () => {
  it("hides auth-specific actions while status is loading", () => {
    expect(resolveLandingHeaderActions("loading")).toEqual([]);
  });

  it("offers sign in and create to anonymous visitors", () => {
    expect(resolveLandingHeaderActions("anonymous")).toEqual([
      "signIn",
      "create",
    ]);
  });

  it("replaces sign in with workspace for authenticated visitors", () => {
    expect(resolveLandingHeaderActions("authenticated")).toEqual([
      "workspace",
      "create",
    ]);
  });
});
