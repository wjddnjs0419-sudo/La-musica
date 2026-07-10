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
};

export default function PlayerControls({
  playing,
  onTogglePlay,
}: PlayerControlsProps) {
  return (
    <div className="flex items-center gap-4 text-white/60 sm:gap-5">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
        title="Previous"
        disabled
      >
        <PreviousIcon className="h-5 w-5 opacity-45" />
        <span className="sr-only">Previous track</span>
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 focus:outline-none focus:ring-2 focus:ring-white/30"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <PauseIcon className="h-6 w-6" />
        ) : (
          <PlayIcon className="h-6 w-6 pl-0.5" />
        )}
        <span className="sr-only">{playing ? "Pause" : "Play"}</span>
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
        title="Next"
        disabled
      >
        <NextIcon className="h-5 w-5 opacity-45" />
        <span className="sr-only">Next track</span>
      </button>
    </div>
  );
}
