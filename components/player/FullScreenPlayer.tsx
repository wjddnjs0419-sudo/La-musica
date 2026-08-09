"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import LyricsView from "@/components/lyrics/LyricsView";
import PlayerProgressBar from "@/components/player/PlayerProgressBar";
import VolumeControl from "@/components/player/VolumeControl";
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
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function FullScreenPlayer({
  track,
  playing,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onClose,
  onPrev,
  onNext,
}: FullScreenPlayerProps) {
  // Use audio element's actual duration as primary source — track.duration_seconds
  // may be null before the audio loads, which causes approximateLyricTimings to
  // return [] and the lyrics view to show "No lyrics available".
  const resolvedDuration = duration || track.duration_seconds || 0;
  const lyricLines = React.useMemo(
    () => parseMusicLyrics(track.metadata, resolvedDuration) ?? [],
    [track, resolvedDuration],
  );
  const isInstrumental = Boolean(track.metadata?.instrumental);
  const hasLyrics = !isInstrumental && lyricLines.length > 0;

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
      <div className="absolute inset-0 bg-[#090909]/75" />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8 lg:px-12">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center gap-2 text-sm text-white/50 transition hover:text-white"
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
            <span className="hidden sm:inline">Back to my music</span>
          </button>
          <p className="text-xs font-medium tracking-[0.14em] text-white/35">
            Now playing
          </p>
          <div className="h-9 w-9" aria-hidden />
        </header>

        <main
          className={`mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-8 overflow-y-auto px-6 py-7 sm:px-10 lg:grid-cols-[minmax(380px,0.95fr)_minmax(300px,0.75fr)] lg:items-center lg:gap-20 lg:overflow-hidden lg:px-12 ${
            hasLyrics ? "" : "lg:max-w-3xl lg:grid-cols-1"
          }`}
        >
          <section className={`min-h-0 ${hasLyrics ? "" : "mx-auto w-full max-w-[570px]"}`}>
            <div className="aspect-square w-full overflow-hidden bg-white/[0.06] shadow-2xl shadow-black/45 lg:max-h-[calc(100dvh-420px)] lg:max-w-[calc(100dvh-420px)]">
              {track.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.thumbnail_url}
                  alt={`${track.title} artwork`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-violet-500 via-indigo-600 to-sky-500" />
              )}
            </div>
            <div className="pt-5 sm:pt-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                {isInstrumental ? "Instrumental" : "La Musica AI"}
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.045em] text-[#f4f1ea] sm:text-4xl">
                {track.title}
              </h1>
              <p className="mt-2 text-sm text-white/45">
                {resolvedDuration ? `${Math.floor(resolvedDuration / 60)} min ${Math.round(resolvedDuration % 60)} sec` : "AI generated music"}
              </p>
            </div>
          </section>

          {hasLyrics && (
            <section className="flex min-h-[18rem] flex-col overflow-hidden lg:h-full lg:min-h-0 lg:max-h-[min(620px,calc(100dvh-250px))]">
              <p className="mb-4 shrink-0 text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                Lyrics
              </p>
              <div className="min-h-0 flex-1 overflow-hidden">
                <LyricsView
                  lines={lyricLines}
                  currentTimeMs={currentTime * 1000}
                  instrumental={false}
                />
              </div>
            </section>
          )}
        </main>

        <footer className="shrink-0 border-t border-white/10 px-6 pb-3 pt-1 sm:px-10 sm:pb-4 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <PlayerProgressBar
              currentTime={currentTime}
              duration={resolvedDuration}
              onSeek={onSeek}
            />
            <div className="relative mt-2 flex items-center justify-center gap-6 sm:gap-8">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default"
              aria-label="Previous track"
            >
              <PreviousIcon className={`h-6 w-6 ${!onPrev ? "opacity-30" : ""}`} />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f1ea] text-black hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/30 sm:h-14 sm:w-14"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6 pl-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15 disabled:cursor-default"
              aria-label="Next track"
            >
              <NextIcon className={`h-6 w-6 ${!onNext ? "opacity-30" : ""}`} />
            </button>
              <div className="absolute right-6 hidden lg:block">
                <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
              </div>
          </div>
          </div>
        </footer>
      </div>
    </div>
  );

  if (!portalTarget) return null;
  return createPortal(content, portalTarget);
}
