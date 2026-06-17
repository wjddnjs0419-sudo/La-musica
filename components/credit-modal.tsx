"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { CREDIT_PLANS, type CreditPlanId } from "@/lib/credits";

type CreditModalProps = {
  open: boolean;
  onClose: () => void;
  onCreditRedeemed?: (creditBalance: number) => void;
};

type CouponResponse = {
  ok?: boolean;
  creditsGranted?: unknown;
  creditBalance?: unknown;
  message?: unknown;
  error?: unknown;
};

const COUPON_ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "Please sign in to redeem a code.",
  invalid_coupon: "Invalid code. Please check and try again.",
  coupon_inactive: "This code is no longer active.",
  coupon_not_started: "This code is not active yet.",
  coupon_expired: "This code has expired.",
  coupon_sold_out: "This code has reached its usage limit.",
  already_redeemed: "You already used this code.",
  server_error: "The code could not be redeemed. Please try again.",
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

export default function CreditModal({
  open,
  onClose,
  onCreditRedeemed,
}: CreditModalProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<CreditPlanId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setLoadingPlanId(null);
    setErrorMessage(null);
    setCouponCode("");
    setCouponLoading(false);
    setCouponError(null);
    setCouponSuccess(null);
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

  const handleCouponSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = couponCode.trim();
    if (!code) {
      setCouponSuccess(null);
      setCouponError(COUPON_ERROR_MESSAGES.invalid_coupon);
      return;
    }

    setCouponLoading(true);
    setCouponSuccess(null);
    setCouponError(null);

    try {
      const response = await fetch("/api/credits/redeem-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = (await response.json().catch(() => ({}))) as CouponResponse;
      if (!response.ok || data.ok !== true) {
        const errorCode = typeof data.error === "string" ? data.error : "";
        const message =
          (typeof data.message === "string" && data.message) ||
          COUPON_ERROR_MESSAGES[errorCode] ||
          COUPON_ERROR_MESSAGES.server_error;
        throw new Error(message);
      }

      const creditsGranted =
        typeof data.creditsGranted === "number" ? data.creditsGranted : 1;
      if (typeof data.creditBalance === "number") {
        onCreditRedeemed?.(data.creditBalance);
      }
      setCouponCode("");
      setCouponSuccess(
        creditsGranted === 1
          ? "Success! 1 song credit has been added."
          : `Success! ${creditsGranted} song credits have been added.`,
      );
    } catch (err) {
      console.error("coupon redemption failed", err);
      setCouponError(
        err instanceof Error
          ? err.message
          : COUPON_ERROR_MESSAGES.server_error,
      );
    } finally {
      setCouponLoading(false);
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

        <form
          onSubmit={handleCouponSubmit}
          className="mt-5 border-t border-white/10 pt-5"
        >
          <label
            htmlFor="beta-code"
            className="text-sm font-medium text-white/70"
          >
            Have a beta code?
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="beta-code"
              type="text"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value);
                setCouponError(null);
                setCouponSuccess(null);
              }}
              placeholder="Enter beta code"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-sm text-white placeholder:text-white/35 transition-colors focus:border-white/25 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/10"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/18 bg-white/[0.08] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.13] focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {couponLoading ? "Redeeming..." : "Redeem code"}
            </button>
          </div>
          {couponSuccess ? (
            <p className="mt-3 text-sm text-emerald-200">{couponSuccess}</p>
          ) : null}
          {couponError ? (
            <p className="mt-3 text-sm text-red-200">{couponError}</p>
          ) : null}
        </form>

        {errorMessage ? (
          <p className="mt-4 text-sm text-red-200">{errorMessage}</p>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
