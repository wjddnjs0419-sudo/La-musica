"use client";

import { useState } from "react";

import { CREDIT_PLANS, type CreditPlanId } from "@/lib/credits";
import { useAuthModal } from "@/components/auth-context";

type CreditPlan = (typeof CREDIT_PLANS)[number];

const PRICING_COPY: Record<
  CreditPlanId,
  { highlight?: boolean; features: string[] }
> = {
  starter: {
    features: [
      "A low-risk way to test the waters.",
      "Validate a song idea in minutes.",
      "Perfect for your very first track.",
    ],
  },
  creator: {
    highlight: true,
    features: [
      "Built for steady, everyday creators.",
      "Room to experiment across moods and genres.",
      "The best value per song we offer.",
    ],
  },
  "viral-pack": {
    features: [
      "Made for high-volume production.",
      "Fuel reels, shorts, and full playlists.",
      "Our lowest cost per finished track.",
    ],
  },
};

function PricingCard({
  plan,
  loading,
  onSelect,
}: {
  plan: CreditPlan;
  loading: boolean;
  onSelect: (id: CreditPlanId) => void;
}) {
  const { id, name, price, credits } = plan;
  const { highlight, features } = PRICING_COPY[id];

  return (
    <article
      className={`flex flex-col rounded-lg border p-5 text-left transition-colors sm:p-6 ${
        highlight
          ? "border-white/30 bg-white/[0.10] hover:border-white/45"
          : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/55">{name}</p>
        {highlight ? (
          <span className="shrink-0 rounded-full border border-white/20 bg-white/[.08] px-2.5 py-0.5 text-xs font-medium text-white/75">
            Most popular
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-4xl font-semibold text-white">{price}</p>
      <p className="mt-1 text-sm text-white/45">{credits} songs</p>

      <ul className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex gap-2.5 text-sm leading-6 text-white/70"
          >
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading}
        onClick={() => onSelect(id)}
        className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/25 ${
          highlight
            ? "bg-white text-black hover:bg-white/85"
            : "border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]"
        }`}
      >
        {loading ? "Opening..." : "Get credits"}
      </button>
    </article>
  );
}

export default function PricingSection() {
  const { openAuth } = useAuthModal();
  const [pendingPlan, setPendingPlan] = useState<CreditPlanId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelect = async (planId: CreditPlanId) => {
    if (pendingPlan) return;
    setPendingPlan(planId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (response.status === 401) {
        openAuth({ returnTo: "/#pricing", intent: "signin" });
        setPendingPlan(null);
        return;
      }

      const data = (await response.json()) as { url?: unknown; error?: string };
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(data.error ?? "checkout_failed");
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("pricing checkout failed", error);
      setPendingPlan(null);
      setErrorMessage("Checkout could not be opened. Please try again.");
    }
  };

  return (
    <section
      id="pricing"
      className="relative isolate scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto max-w-[90rem]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Pricing</p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
            Pay as you go.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
            No subscription. No renewal. Just the song credits you need.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3">
          {CREDIT_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              loading={pendingPlan === plan.id}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {errorMessage ? (
          <p className="mt-5 text-center text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
