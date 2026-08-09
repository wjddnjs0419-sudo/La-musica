"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { CREDIT_PLANS, type CreditPlanId } from "@/lib/credits";

type CreditModalProps = {
  open: boolean;
  onClose: () => void;
  creditBalance?: number;
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
      className="flex min-h-64 flex-col border border-white/15 bg-[#0b0b0c] p-6 text-left transition hover:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-wait disabled:opacity-65"
      disabled={loading}
      onClick={() => onCheckout(id)}
    >
      <div>
        {id === "creator" ? <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.15em] text-white/40">Popular</p> : null}
        <p className="text-lg font-medium text-[#f4f1ea]">{name}</p>
        <p className="mt-5 text-3xl font-medium tracking-[-0.04em] text-[#f4f1ea]">{price}</p>
        <p className="mt-2 text-sm text-white/45">{credits} songs</p>
      </div>
      <span className="rounded-full bg-[#f4f1ea] px-5 py-2.5 text-center text-sm font-medium text-black">{loading ? "Opening..." : "Get credits"}</span>
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
  creditBalance = 0,
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
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
      className="fixed inset-0 z-[100] flex h-[100dvh] items-center justify-center overflow-hidden overscroll-contain bg-black/80 px-4 py-4 backdrop-blur-sm sm:px-8 sm:py-8"
      role="presentation"
      onClick={handleClose}
    >
      <section
        aria-labelledby="credit-modal-title"
        aria-modal="true"
        role="dialog"
        className="custom-scrollbar relative max-h-[calc(100dvh-2rem)] w-full max-w-[980px] overflow-y-auto overscroll-contain border border-white/15 bg-[#0b0b0c] px-6 py-8 shadow-2xl shadow-black/50 sm:max-h-[calc(100dvh-4rem)] sm:px-10 sm:py-9"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/40">La Musica credits</p>
            <h2
              id="credit-modal-title"
              className="mt-2 text-4xl font-medium tracking-[-0.04em] text-[#f4f1ea]"
            >
              Upgrade
            </h2>
            <p className="mt-2 text-lg text-white/55">Choose the credits you need.</p>
          </div>
          <button
            type="button"
            aria-label="Close credit modal"
            className="absolute right-6 top-6 text-white/45 transition hover:text-white sm:right-8 sm:top-8"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-8 flex items-center justify-end border-b border-white/10 pb-7 text-sm text-white/45">Current balance: {creditBalance} credits</div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
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
          className="mt-8 border-t border-white/10 pt-8"
        >
          <label
            htmlFor="beta-code"
            className="text-lg font-medium text-[#f4f1ea]"
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
              className="h-12 min-w-0 max-w-md flex-1 border border-white/15 bg-[#111113] px-4 text-lg text-white placeholder:text-white/35 transition focus:border-white/45 focus:outline-none"
            />
            <button
              type="submit"
              disabled={couponLoading || !couponCode.trim()}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-5 text-lg font-medium text-white transition hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-55"
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
