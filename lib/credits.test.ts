import { describe, it, expect } from "vitest";
import { CREDIT_PLANS, getCreditPlan } from "./credits";

describe("CREDIT_PLANS", () => {
  it("larger plans have a strictly lower unit price per credit", () => {
    const prices = CREDIT_PLANS.map((plan) => {
      const numeric = parseFloat(plan.price.replace("$", ""));
      return numeric / plan.credits;
    });
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThan(prices[i - 1]);
    }
  });

  it("Viral Pack has lower unit price than Creator", () => {
    const creator = CREDIT_PLANS.find((p) => p.id === "creator")!;
    const viral = CREDIT_PLANS.find((p) => p.id === "viral-pack")!;
    const creatorUnit =
      parseFloat(creator.price.replace("$", "")) / creator.credits;
    const viralUnit =
      parseFloat(viral.price.replace("$", "")) / viral.credits;
    expect(viralUnit).toBeLessThan(creatorUnit);
  });

  it("getCreditPlan returns the correct plan by id", () => {
    expect(getCreditPlan("starter")?.credits).toBe(5);
    expect(getCreditPlan("creator")?.credits).toBe(20);
    expect(getCreditPlan("viral-pack")?.credits).toBe(50);
  });

  it("getCreditPlan returns null for unknown id", () => {
    expect(getCreditPlan("unknown")).toBeNull();
  });
});
