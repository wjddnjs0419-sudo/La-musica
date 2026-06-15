export const CREDIT_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$2.99",
    credits: 5,
    productEnvKey: "POLAR_STARTER_PRODUCT_ID",
  },
  {
    id: "creator",
    name: "Creator",
    price: "$7.99",
    credits: 20,
    productEnvKey: "POLAR_CREATOR_PRODUCT_ID",
  },
  {
    id: "viral-pack",
    name: "Viral Pack",
    price: "$14.99",
    credits: 50,
    productEnvKey: "POLAR_VIRAL_PACK_PRODUCT_ID",
  },
] as const;

export type CreditPlanId = (typeof CREDIT_PLANS)[number]["id"];

export function getCreditPlan(planId: string) {
  return CREDIT_PLANS.find((plan) => plan.id === planId) ?? null;
}
