"use client";

import * as React from "react";
import type { Music } from "@/lib/music";

type WorkspaceMusicPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
};

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

const VolumeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path
      d="M4 10v4h4l5 4V6l-5 4H4z"
      fill="currentColor"
    />
    <path
      d="M16 9.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5M18.5 7c1.4 1.3 2.1 3 2.1 5s-.7 3.7-2.1 5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
  </svg>
);

export default function WorkspaceMusicPlayer({
  track,
  playing,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onClose,
}: WorkspaceMusicPlayerProps) {
  const resolvedDuration = duration || track.duration_seconds || 60;
  const progressValue = Math.min(currentTime, resolvedDuration);

  return (
    <section
      aria-label="Now playing"
      className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#111216]/95"
    >
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3 px-3 pt-2">
        <span className="text-right text-[10px] tabular-nums text-white/45">
          {formatTime(currentTime)}
        </span>
        <div className="relative h-1 bg-white/10">
          <progress
            value={progressValue}
            max={resolvedDuration}
            aria-hidden
            className="absolute inset-0 h-1 w-full appearance-none overflow-hidden [&::-moz-progress-bar]:bg-white [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white"
          />
          <input
            type="range"
            min={0}
            max={resolvedDuration}
            step={1}
            value={progressValue}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Seek track"
            className="absolute inset-0 h-1 w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </div>
        <span className="text-[10px] tabular-nums text-white/45">
          {formatTime(resolvedDuration)}
        </span>
      </div>
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)] items-center gap-3 px-3 py-2 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_minmax(180px,0.8fr)]">
        <div className="flex min-w-0 items-center gap-3">
          <DefaultAlbumThumbnail />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white/90">
              {track.title}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">AI Generated</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <div className="flex items-center gap-5 text-white/60">
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
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 text-white/50">
          <VolumeIcon className="h-4 w-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            aria-label="Volume"
            className="h-1 w-24 accent-white"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            title="Close player"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Close player</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function DefaultAlbumThumbnail() {
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500">
      <div
        aria-hidden
        className="absolute inset-0 bg-white/[0.06]"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="relative h-6 w-6 text-white"
      >
        <path
          d="M9 18V7l10-2v11"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
        <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
      </svg>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
