"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type CreditModalProps = {
  open: boolean;
  onClose: () => void;
};

const creditPlans = [
  {
    name: "Starter",
    price: "$2.99",
    credits: "5 songs",
  },
  {
    name: "Creator",
    price: "$7.99",
    credits: "20 songs",
  },
  {
    name: "Viral Pack",
    price: "$14.99",
    credits: "50 songs",
  },
];

function CreditPlanCard({
  name,
  price,
  credits,
}: {
  name: string;
  price: string;
  credits: string;
}) {
  return (
    <article className="flex min-h-40 flex-col justify-between rounded-lg border border-white/12 bg-white/[0.06] p-5 text-left transition-colors hover:border-white/25 hover:bg-white/[0.09]">
      <div>
        <p className="text-sm font-medium text-white/55">{name}</p>
        <p className="mt-3 text-3xl font-semibold text-white">{price}</p>
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <p className="text-sm text-white/45">Credits</p>
        <p className="mt-1 text-lg font-medium text-white">{credits}</p>
      </div>
    </article>
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
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
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
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {creditPlans.map((plan) => (
            <CreditPlanCard key={plan.name} {...plan} />
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
