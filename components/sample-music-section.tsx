"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { LandingSampleTrack } from "@/lib/landing-samples";

type SampleMusicSectionProps = {
  tracks: LandingSampleTrack[];
};

function formatButtonLabel(track: LandingSampleTrack, isActive: boolean) {
  return isActive ? `Pause ${track.title}` : `Play ${track.title}`;
}

export default function SampleMusicSection({ tracks }: SampleMusicSectionProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = async (track: LandingSampleTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    setErrorMessage(null);

    if (activeTrackId === track.id && playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (activeTrackId !== track.id) {
      audio.pause();
      audio.src = track.audioSrc;
      audio.currentTime = 0;
      audio.load();
      setActiveTrackId(track.id);
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      console.error("sample playback failed", error);
      setPlaying(false);
      setErrorMessage("Preview could not be played. Please try again.");
    }
  };

  return (
    <section
      id="features"
      className="relative isolate px-4 py-14 sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:max-w-2xl">
          <p className="text-sm font-semibold uppercase text-sky-200/80">
            Featured creations
          </p>
          <h2 className="text-2xl font-semibold text-white sm:text-4xl lg:text-5xl">
            Hear four tracks made with La Musica.
          </h2>
          <p className="text-base leading-7 text-white/62 sm:text-lg">
            These are pinned from real generations, with the original AI cover
            art and audio loaded from the music library.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((track) => {
            const isActive = activeTrackId === track.id && playing;

            return (
              <article
                key={track.id}
                className="group rounded-lg border border-white/10 bg-white/[0.04] p-3 transition-colors hover:border-white/25 hover:bg-white/[0.07] sm:p-4"
              >
                <button
                  type="button"
                  onClick={() => void handleToggle(track)}
                  aria-label={formatButtonLabel(track, isActive)}
                  className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-black transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/60"
                >
                  {track.thumbnailSrc ? (
                    <Image
                      src={track.thumbnailSrc}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[radial-gradient(circle_at_28%_26%,rgba(255,255,255,0.34),transparent_22%),linear-gradient(135deg,#111827,#334155_52%,#020617)]"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-black/8 transition-colors group-hover:bg-black/18"
                  />
                  <span
                    className={`absolute flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-black/38 shadow-xl shadow-black/30 backdrop-blur transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "scale-95 ring-2 ring-sky-200/60" : ""
                    }`}
                  >
                    <Image
                      src="/icons/play-sample.svg"
                      alt=""
                      aria-hidden
                      width={20}
                      height={20}
                      className={`h-5 w-5 ${isActive ? "opacity-55" : ""}`}
                    />
                  </span>
                </button>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-white">
                      {track.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/52">
                      {track.description}
                    </p>
                  </div>
                  <p className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-white/55">
                    {track.duration}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {errorMessage ? (
          <p className="mt-5 text-sm text-red-200">{errorMessage}</p>
        ) : null}

        <audio
          ref={audioRef}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          className="hidden"
        />
      </div>
    </section>
  );
}
