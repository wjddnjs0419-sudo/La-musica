"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import LyricsView from "@/components/lyrics/LyricsView";
import PlayerProgressBar from "@/components/player/PlayerProgressBar";
import { parseMusicLyrics } from "@/lib/player/lyrics";
import type { Music } from "@/lib/music";

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

export type FullScreenPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function FullScreenPlayer({
  track,
  playing,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onClose,
  onPrev,
  onNext,
}: FullScreenPlayerProps) {
  // Use audio element's actual duration as primary source — track.duration_seconds
  // may be null before the audio loads, which causes approximateLyricTimings to
  // return [] and the lyrics view to show "No lyrics available".
  const resolvedDuration = duration || track.duration_seconds || 0;
  const lyricLines = React.useMemo(
    () => parseMusicLyrics(track.metadata, resolvedDuration),
    [track, resolvedDuration],
  );
  const isInstrumental = Boolean(track.metadata?.instrumental);

  // Lock scroll while fullscreen is mounted.
  // Chrome shifts scroll responsibility from body to html when body gets overflow:hidden,
  // so we lock both. Also reset window scroll to 0 so scroll-behavior:smooth on html
  // doesn't animate a stale scroll position into view.
  React.useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    const prevScrollTop = window.scrollY;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      window.scrollTo(0, prevScrollTop);
    };
  }, []);

  const portalTarget =
    typeof document === "undefined" ? null : document.body;

  const content = (
    <div
      style={{ position: "fixed", top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999, overscrollBehavior: "none" }}
      className="flex flex-col overflow-hidden touch-none"
    >
      {track.thumbnail_url ? (
        <img
          src={track.thumbnail_url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.25]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-indigo-950/80 to-sky-950/80" />
      )}
      <div className="absolute inset-0 bg-[#0a0b0e]/65" />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:text-white"
            aria-label="Close full player"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path
                d="M6 18 18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
            Now Playing
          </p>
          <div className="h-9 w-9" aria-hidden />
        </div>

        <div className="px-6 pb-2 pt-1 text-center">
          <p className="text-base font-bold text-white/95">{track.title}</p>
          <p className="mt-0.5 text-[11px] text-white/40">AI Generated</p>
        </div>

        {/* Lyrics fill the space the album cover used to occupy. LyricsView
            itself shows the instrumental/no-lyrics placeholder. */}
        <div className="min-h-0 flex-1">
          <LyricsView
            lines={lyricLines ?? []}
            currentTimeMs={currentTime * 1000}
            instrumental={isInstrumental}
          />
        </div>

        <div className="px-6 pb-8 pt-2">
          <PlayerProgressBar
            currentTime={currentTime}
            duration={resolvedDuration}
            onSeek={onSeek}
          />

          <div className="mt-5 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default"
              aria-label="Previous track"
            >
              <PreviousIcon className={`h-6 w-6 ${!onPrev ? "opacity-30" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <PauseIcon className="h-8 w-8" />
              ) : (
                <PlayIcon className="h-8 w-8 pl-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default"
              aria-label="Next track"
            >
              <NextIcon className={`h-6 w-6 ${!onNext ? "opacity-30" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!portalTarget) return null;
  return createPortal(content, portalTarget);
}
