"use client";

import { useState } from "react";

import { CREDIT_PLANS, type CreditPlanId } from "@/lib/credits";

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

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 h-4 w-4 shrink-0 text-sky-300"
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

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
      className={`flex flex-col rounded-xl border p-6 text-left transition-colors ${
        highlight
          ? "border-sky-400/40 bg-white/[0.08] hover:border-sky-300/60"
          : "border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/55">{name}</p>
        {highlight ? (
          <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-xs font-medium text-sky-200">
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
            <CheckIcon />
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
            ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
            : "border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]"
        }`}
      >
        {loading ? "Opening..." : "Get credits"}
      </button>
    </article>
  );
}

export default function PricingSection() {
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
        window.location.assign("/auth");
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
      className="relative isolate scroll-mt-24 px-6 py-24 sm:px-8 sm:py-28 lg:px-12"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Simple, pay-as-you-go pricing.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
            No subscriptions. Buy the song credits you need and start creating
            right away.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
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
