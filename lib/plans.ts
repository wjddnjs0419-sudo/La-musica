// Single source of truth for purchasable credit plans.
// Amounts and credit grants are read server-side only — never trust the client
// to send a price. Stripe price ids come from the synced `test` catalog.

export type PlanKey = "starter" | "creator" | "viral";

export type Plan = {
  key: PlanKey;
  name: string;
  /** Display price, e.g. "$2.99". */
  price: string;
  /** Display credits, e.g. "5 songs". */
  credits: string;
  /** Number of song credits granted on successful payment. */
  creditAmount: number;
  /** Charge amount in cents (mirrors the Stripe price). */
  amountCents: number;
  /** Stripe test-mode price id (price_...). */
  priceId: string;
  highlight?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    price: "$2.99",
    credits: "5 songs",
    creditAmount: 5,
    amountCents: 299,
    priceId: "price_starter_placeholder",
    features: [
      "A low-risk way to test the waters.",
      "Validate a song idea in minutes.",
      "Perfect for your very first track.",
    ],
  },
  {
    key: "creator",
    name: "Creator",
    price: "$7.99",
    credits: "20 songs",
    creditAmount: 20,
    amountCents: 799,
    priceId: "price_creator_placeholder",
    highlight: true,
    features: [
      "Built for steady, everyday creators.",
      "Room to experiment across moods and genres.",
      "The best value per song we offer.",
    ],
  },
  {
    key: "viral",
    name: "Viral Pack",
    price: "$14.99",
    credits: "50 songs",
    creditAmount: 50,
    amountCents: 1499,
    priceId: "price_viral_placeholder",
    features: [
      "Made for high-volume production.",
      "Fuel reels, shorts, and full playlists.",
      "Our lowest cost per finished track.",
    ],
  },
];

export function getPlan(key: string): Plan | undefined {
  return PLANS.find((plan) => plan.key === key);
}
