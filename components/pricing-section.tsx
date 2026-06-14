"use client";

import { useState } from "react";

import { startCheckout } from "@/lib/checkout-client";
import { PLANS, type Plan, type PlanKey } from "@/lib/plans";

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-sky-300">
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
  plan: Plan;
  loading: boolean;
  onSelect: (key: PlanKey) => void;
}) {
  const { name, price, credits, highlight, features } = plan;

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
      <p className="mt-1 text-sm text-white/45">{credits}</p>

      <ul className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm leading-6 text-white/70">
            <CheckIcon />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading}
        onClick={() => onSelect(plan.key)}
        className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/25 ${
          highlight
            ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
            : "border border-white/20 bg-white/[0.06] text-white hover:bg-white/[0.12]"
        }`}
      >
        {loading ? "Redirecting…" : "Get credits"}
      </button>
    </article>
  );
}

export default function PricingSection() {
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);

  const handleSelect = async (key: PlanKey) => {
    if (pendingPlan) return;
    setPendingPlan(key);
    try {
      await startCheckout(key);
    } catch (error) {
      console.error("pricing checkout failed", error);
      setPendingPlan(null);
    }
  };

  return (
    <section className="relative isolate px-6 py-24 sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Simple, pay-as-you-go pricing.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
            No subscriptions. Buy the song credits you need and start creating right away.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard
              key={plan.key}
              plan={plan}
              loading={pendingPlan === plan.key}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
