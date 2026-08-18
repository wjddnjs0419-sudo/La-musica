import { describe, it, expect } from "vitest";
import { CREDIT_PLANS, getCreditPlan } from "./credits";

describe("CREDIT_PLANS", () => {
  it("defines the approved price and credit amounts", () => {
    const starter = CREDIT_PLANS.find((p) => p.id === "starter")!;
    const creator = CREDIT_PLANS.find((p) => p.id === "creator")!;
    const viral = CREDIT_PLANS.find((p) => p.id === "viral-pack")!;

    expect(starter).toMatchObject({ price: "$2.99", credits: 5 });
    expect(creator).toMatchObject({ price: "$7.99", credits: 20 });
    expect(viral).toMatchObject({ price: "$14.99", credits: 35 });
  });

  it("getCreditPlan returns the correct plan by id", () => {
    expect(getCreditPlan("starter")?.credits).toBe(5);
    expect(getCreditPlan("creator")?.credits).toBe(20);
    expect(getCreditPlan("viral-pack")?.credits).toBe(35);
  });

  it("getCreditPlan returns null for unknown id", () => {
    expect(getCreditPlan("unknown")).toBeNull();
  });
});
