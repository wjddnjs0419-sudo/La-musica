"use client";

import * as React from "react";
import MusicThumbnail from "@/components/music-thumbnail";
import PlayerProgressBar from "@/components/player/PlayerProgressBar";
import PlayerControls from "@/components/player/PlayerControls";
import VolumeControl from "@/components/player/VolumeControl";
import type { Music } from "@/lib/music";

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

export type MiniPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
  onOpenFullscreen?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function MiniPlayer({
  track,
  playing,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onClose,
  onOpenFullscreen,
  onPrev,
  onNext,
}: MiniPlayerProps) {
  const resolvedDuration = duration || track.duration_seconds || 0;

  return (
    <section
      aria-label="Now playing"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b0c]/[0.96] shadow-[0_-18px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl"
    >
      {/* Mobile: compact bar with an accessible full-player entry point. */}
      <div className="flex items-center gap-2 px-3 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={onOpenFullscreen}
          disabled={!onOpenFullscreen}
          aria-label="Open full player"
          className="shrink-0 disabled:cursor-default"
        >
          <MusicThumbnail
            track={track}
            className="h-10 w-10 rounded-none"
            showTitle={Boolean(track.thumbnail_url)}
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white/90">
            {track.title}
          </p>
          <p className="text-[10px] text-white/40">AI Generated</p>
        </div>
        <PlayerControls
          playing={playing}
          onTogglePlay={onTogglePlay}
          onPrev={onPrev}
          onNext={onNext}
          compact
        />
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
          title="Close player"
        >
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Close player</span>
        </button>
      </div>

      {/* Desktop: track · transport · progress and utilities. */}
      <div className="hidden h-[76px] items-center gap-5 px-6 lg:grid lg:grid-cols-[minmax(210px,1fr)_minmax(220px,0.8fr)_minmax(300px,1fr)] xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenFullscreen}
            disabled={!onOpenFullscreen}
            aria-label="Open full player"
            className="shrink-0 disabled:cursor-default"
          >
            <MusicThumbnail
              track={track}
              className="h-12 w-12 rounded-none"
              showTitle={Boolean(track.thumbnail_url)}
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#f4f1ea]">
              {track.title}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">AI Generated</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <PlayerControls
            playing={playing}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
          />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <div className="min-w-[170px] flex-1">
            <PlayerProgressBar
              currentTime={currentTime}
              duration={resolvedDuration}
              onSeek={onSeek}
            />
          </div>
          <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
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
