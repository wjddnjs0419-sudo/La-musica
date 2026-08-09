import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTH_RETURN_PATH,
  sanitizeAuthReturnPath,
} from "./auth-return";

describe("sanitizeAuthReturnPath", () => {
  it("keeps an internal return path and its query string", () => {
    expect(sanitizeAuthReturnPath("/workspace?create=1")).toBe(
      "/workspace?create=1",
    );
  });

  it.each([null, "https://attacker.example", "//attacker.example", "workspace"]) (
    "falls back for an unsafe return path: %s",
    (value) => {
      expect(sanitizeAuthReturnPath(value)).toBe(DEFAULT_AUTH_RETURN_PATH);
    },
  );
});
