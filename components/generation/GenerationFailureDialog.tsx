"use client";

export type RefundStatus = "not_required" | "pending" | "refunded" | "failed";

type GenerationFailureDialogProps = {
  refundStatus: RefundStatus;
  onTryAgain: () => void;
  onEditPrompt: () => void;
  onClose: () => void;
};

export default function GenerationFailureDialog({
  refundStatus,
  onTryAgain,
  onEditPrompt,
  onClose,
}: GenerationFailureDialogProps) {
  const refundMessage =
    refundStatus === "refunded"
      ? "Your credit has been returned."
      : refundStatus === "failed"
        ? "We couldn't confirm the credit refund yet. Please contact support if your credit does not return."
        : "Your credit refund is being processed.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0e]/90 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-white/8 bg-[#161820] px-8 py-8 text-center shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-400/[0.08]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-red-300"
            aria-hidden
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white/90">
            Music generation failed
          </h2>
          <p className="mt-1 text-sm text-white/50">
            We couldn&apos;t finish this song.
          </p>
          <p className="mt-2 text-sm text-white/70">{refundMessage}</p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onTryAgain}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onEditPrompt}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.10]"
          >
            Edit prompt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-xs text-white/35 hover:text-white/60"
          >
            Back to workspace
          </button>
        </div>

        {refundStatus === "failed" && (
          <a
            href="/contact"
            className="text-xs text-white/35 underline hover:text-white/60"
          >
            Contact support
          </a>
        )}
      </div>
    </div>
  );
}
