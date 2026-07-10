"use client";

import * as React from "react";
import { calcGenerationProgress, type GenerationPhase } from "@/lib/generation/progress";

type GenerationProgressScreenProps = {
  startMs: number;
  phase: Extract<GenerationPhase, "generating" | "success">;
  onClose: () => void;
};

export default function GenerationProgressScreen({
  startMs,
  phase,
  onClose,
}: GenerationProgressScreenProps) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (phase === "success") return;
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 200);
    return () => window.clearInterval(id);
  }, [startMs, phase]);

  const { percent, message } =
    phase === "success"
      ? { percent: 100, message: "Your song is ready." }
      : calcGenerationProgress(elapsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0e]/90 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white/80"
        title="Minimize"
        aria-label="Minimize progress"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            d="M6 18 18 6M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_0_40px_rgba(255,255,255,0.06)]">
          {phase === "success" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7 text-emerald-300"
              aria-hidden
            >
              <path
                d="m5 13 4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white/90">
            {phase === "success" ? "Song Ready" : "Creating Your Music"}
          </h2>
          <p className="mt-1.5 text-sm text-white/45">{message}</p>
        </div>

        <div className="w-full">
          <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-right text-[11px] tabular-nums text-white/35">
            {percent}%
          </p>
        </div>

        {phase !== "success" && (
          <p className="text-[11px] text-white/25">This may take a minute.</p>
        )}
      </div>
    </div>
  );
}
