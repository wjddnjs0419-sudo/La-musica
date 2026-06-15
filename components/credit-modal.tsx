"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CREDIT_PLANS, type CreditPlanId } from "@/lib/credits";

type CreditModalProps = {
  open: boolean;
  onClose: () => void;
};

function CreditPlanCard({
  id,
  name,
  price,
  credits,
  loading,
  onCheckout,
}: {
  id: CreditPlanId;
  name: string;
  price: string;
  credits: number;
  loading: boolean;
  onCheckout: (planId: CreditPlanId) => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-44 flex-col justify-between rounded-lg border border-white/12 bg-white/[0.06] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-wait disabled:opacity-65"
      disabled={loading}
      onClick={() => onCheckout(id)}
    >
      <div>
        <p className="text-sm font-medium text-white/55">{name}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{price}</p>
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-sm text-white/45">Credits</p>
        <p className="mt-1 text-lg font-medium text-white">{credits} songs</p>
        <p className="mt-4 text-sm font-medium text-white/70">
          {loading ? "Opening..." : "Checkout"}
        </p>
      </div>
    </button>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function CreditModal({ open, onClose }: CreditModalProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<CreditPlanId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setLoadingPlanId(null);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, open]);

  const handleCheckout = async (planId: CreditPlanId) => {
    setLoadingPlanId(planId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      const data = (await response.json()) as { url?: unknown; error?: string };
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(data.error ?? "checkout_failed");
      }

      window.location.assign(data.url);
    } catch (err) {
      console.error("credit checkout failed", err);
      setLoadingPlanId(null);
      setErrorMessage("Checkout could not be opened. Please try again.");
    }
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onClick={handleClose}
    >
      <section
        aria-labelledby="credit-modal-title"
        aria-modal="true"
        role="dialog"
        className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-zinc-950 p-5 shadow-2xl shadow-black/50 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="credit-modal-title"
              className="text-xl font-semibold text-white"
            >
              Upgrade
            </h2>
            <p className="mt-1 text-sm text-white/45">Choose song credits.</p>
          </div>
          <button
            type="button"
            aria-label="Close credit modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {CREDIT_PLANS.map((plan) => (
            <CreditPlanCard
              key={plan.id}
              {...plan}
              loading={loadingPlanId === plan.id}
              onCheckout={handleCheckout}
            />
          ))}
        </div>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-200">{errorMessage}</p>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
