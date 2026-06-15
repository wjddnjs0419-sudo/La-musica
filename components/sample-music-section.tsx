"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type SampleTrack = {
  id: string;
  title: string;
  mood: string;
  duration: string;
  audioSrc: string;
  shellClassName: string;
  artClassName: string;
  clipClassName: string;
};

const SAMPLE_TRACKS: SampleTrack[] = [
  {
    id: "neon-afterglow",
    title: "Neon Afterglow",
    mood: "Synth pop loop",
    duration: "0:06",
    audioSrc: "/samples/neon-afterglow.wav",
    shellClassName:
      "bg-gradient-to-b from-[#f3c766] via-[#ce6e3d] to-[#5a263f]",
    artClassName:
      "bg-[radial-gradient(circle_at_26%_24%,rgba(255,255,255,0.9),transparent_18%),radial-gradient(circle_at_72%_64%,rgba(56,189,248,0.8),transparent_22%),linear-gradient(135deg,#facc15,#f97316_48%,#7c2d12)]",
    clipClassName:
      "[clip-path:polygon(50%_0%,61%_32%,95%_20%,75%_50%,96%_78%,62%_68%,50%_100%,38%_68%,4%_78%,25%_50%,5%_20%,39%_32%)]",
  },
  {
    id: "velvet-drive",
    title: "Velvet Drive",
    mood: "Late-night R&B",
    duration: "0:06",
    audioSrc: "/samples/velvet-drive.wav",
    shellClassName:
      "bg-gradient-to-t from-[#4f46e5] via-[#9d174d] to-[#f9a8d4]",
    artClassName:
      "bg-[radial-gradient(circle_at_68%_28%,rgba(255,255,255,0.9),transparent_15%),radial-gradient(circle_at_24%_76%,rgba(251,113,133,0.85),transparent_25%),linear-gradient(135deg,#312e81,#be185d_54%,#f0abfc)]",
    clipClassName: "[clip-path:circle(45%_at_50%_50%)]",
  },
  {
    id: "copper-sunrise",
    title: "Copper Sunrise",
    mood: "Acoustic pulse",
    duration: "0:06",
    audioSrc: "/samples/copper-sunrise.wav",
    shellClassName:
      "bg-gradient-to-b from-[#7dd3fc] via-[#84cc16] to-[#365314]",
    artClassName:
      "bg-[radial-gradient(circle_at_35%_30%,rgba(254,240,138,0.95),transparent_17%),radial-gradient(circle_at_72%_74%,rgba(34,197,94,0.8),transparent_22%),linear-gradient(135deg,#0e7490,#a3e635_52%,#854d0e)]",
    clipClassName:
      "[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]",
  },
  {
    id: "glass-runner",
    title: "Glass Runner",
    mood: "Cinematic beat",
    duration: "0:06",
    audioSrc: "/samples/glass-runner.wav",
    shellClassName:
      "bg-gradient-to-t from-[#111827] via-[#0f766e] to-[#a7f3d0]",
    artClassName:
      "bg-[radial-gradient(circle_at_28%_66%,rgba(45,212,191,0.95),transparent_22%),radial-gradient(circle_at_76%_22%,rgba(255,255,255,0.8),transparent_14%),linear-gradient(135deg,#020617,#0f766e_58%,#ccfbf1)]",
    clipClassName:
      "[clip-path:polygon(0%_0%,78%_0%,100%_26%,100%_100%,22%_100%,0%_74%)]",
  },
];

function formatButtonLabel(track: SampleTrack, isActive: boolean) {
  return isActive ? `Pause ${track.title}` : `Play ${track.title}`;
}

export default function SampleMusicSection() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = async (track: SampleTrack) => {
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
      className="relative isolate px-6 py-20 sm:px-8 sm:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:max-w-2xl">
          <p className="text-sm font-semibold uppercase text-sky-200/80">
            Sample sounds
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Hear the kind of tracks Musica can sketch from a prompt.
          </h2>
          <p className="text-base leading-7 text-white/62 sm:text-lg">
            Tap a cover to preview a short loop before you start making your own
            song.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLE_TRACKS.map((track) => {
            const isActive = activeTrackId === track.id && playing;

            return (
              <article
                key={track.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
              >
                <button
                  type="button"
                  onClick={() => void handleToggle(track)}
                  aria-label={formatButtonLabel(track, isActive)}
                  className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl p-7 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300/60 ${
                    track.shellClassName
                  }`}
                >
                  <span
                    aria-hidden
                    className={`block aspect-square w-full shadow-2xl shadow-black/30 transition-transform duration-300 group-hover:scale-105 ${track.artClassName} ${track.clipClassName}`}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/12"
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
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {track.title}
                    </h3>
                    <p className="mt-1 text-sm text-white/52">{track.mood}</p>
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
