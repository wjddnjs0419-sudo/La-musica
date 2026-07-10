"use client";

import * as React from "react";

const PreviousIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M6 6h2v12H6zM10 12l9-6v12z" />
  </svg>
);

const NextIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M16 6h2v12h-2zM5 18V6l9 6z" />
  </svg>
);

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </svg>
);

type PlayerControlsProps = {
  playing: boolean;
  onTogglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  compact?: boolean;
};

export default function PlayerControls({
  playing,
  onTogglePlay,
  onPrev,
  onNext,
  compact = false,
}: PlayerControlsProps) {
  return (
    <div className={`flex items-center text-white/60 ${compact ? "gap-1" : "gap-4 sm:gap-5"}`}>
      <button
        type="button"
        onClick={onPrev}
        disabled={!onPrev}
        className={`flex items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default ${compact ? "h-8 w-8" : "h-10 w-10"}`}
        title="Previous"
      >
        <PreviousIcon className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${!onPrev ? "opacity-30" : ""}`} />
        <span className="sr-only">Previous track</span>
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        className={`flex items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-white/30 ${compact ? "h-10 w-10" : "h-12 w-12"}`}
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <PauseIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        ) : (
          <PlayIcon className={`${compact ? "h-5 w-5" : "h-6 w-6"} pl-0.5`} />
        )}
        <span className="sr-only">{playing ? "Pause" : "Play"}</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!onNext}
        className={`flex items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default ${compact ? "h-8 w-8" : "h-10 w-10"}`}
        title="Next"
      >
        <NextIcon className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${!onNext ? "opacity-30" : ""}`} />
        <span className="sr-only">Next track</span>
      </button>
    </div>
  );
}
