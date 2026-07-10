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
}: MiniPlayerProps) {
  const resolvedDuration = duration || track.duration_seconds || 0;

  return (
    <section
      aria-label="Now playing"
      className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#111216]/95"
    >
      <PlayerProgressBar
        currentTime={currentTime}
        duration={resolvedDuration}
        onSeek={onSeek}
      />
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)] items-center gap-3 px-3 py-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_minmax(180px,0.8fr)] lg:py-2">
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
              className="h-11 w-11 sm:h-12 sm:w-12"
              showTitle={Boolean(track.thumbnail_url)}
            />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white/90">
              {track.title}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">AI Generated</p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center">
          <PlayerControls playing={playing} onTogglePlay={onTogglePlay} />
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
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
