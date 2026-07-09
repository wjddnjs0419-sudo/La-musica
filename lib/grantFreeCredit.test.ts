import { describe, it, expect, vi, afterEach } from "vitest";
import { grantFreeCreditSafely } from "./grantFreeCredit";

describe("grantFreeCreditSafely", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns granted true and logs nothing when the RPC grants a new credit", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: { status: "granted" }, error: null });
    const admin = { database: { rpc } };

    const result = await grantFreeCreditSafely(admin, "user-1");

    expect(result).toEqual({ granted: true });
    expect(rpc).toHaveBeenCalledWith("grant_free_credit", { p_user_id: "user-1" });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("returns granted false without logging when the user already had a credit row", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: { status: "skipped" }, error: null });
    const admin = { database: { rpc } };

    const result = await grantFreeCreditSafely(admin, "user-1");

    expect(result).toEqual({ granted: false });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("logs the error and returns granted false when the RPC responds with an error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "permission denied for function grant_free_credit" },
    });
    const admin = { database: { rpc } };

    const result = await grantFreeCreditSafely(admin, "user-1");

    expect(result).toEqual({ granted: false });
    expect(consoleSpy).toHaveBeenCalledWith(
      "free credit grant failed",
      expect.objectContaining({ message: expect.stringContaining("permission denied") }),
    );
  });

  it("logs and returns granted false without throwing when the RPC call itself rejects", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockRejectedValue(new Error("insforge_admin_not_configured"));
    const admin = { database: { rpc } };

    const result = await grantFreeCreditSafely(admin, "user-1");

    expect(result).toEqual({ granted: false });
    expect(consoleSpy).toHaveBeenCalledWith(
      "free credit grant failed",
      expect.objectContaining({ message: "insforge_admin_not_configured" }),
    );
  });
});
