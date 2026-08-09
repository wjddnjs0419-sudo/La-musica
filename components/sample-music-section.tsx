"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { LandingSampleTrack } from "@/lib/landing-samples";

type Props = { tracks: LandingSampleTrack[] };
function PlayIcon({ playing }: { playing: boolean }) { return <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>{playing ? <path d="M7 5h4v14H7zm6 0h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}</svg>; }

export default function SampleMusicSection({ tracks }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleToggle = async (track: LandingSampleTrack) => {
    const audio = audioRef.current; if (!audio) return;
    setErrorMessage(null);
    if (activeTrackId === track.id && playing) { audio.pause(); setPlaying(false); return; }
    if (activeTrackId !== track.id) { audio.pause(); audio.src = track.audioSrc; audio.currentTime = 0; audio.load(); setActiveTrackId(track.id); }
    try { await audio.play(); setPlaying(true); } catch (error) { console.error("sample playback failed", error); setPlaying(false); setErrorMessage("Preview could not be played. Please try again."); }
  };
  return <section id="features" className="border-y border-white/[.07] bg-[#0b0b0c] px-5 py-20 sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto max-w-[90rem]"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Featured creations</p><h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl">Songs made with La Musica.</h2></div><p className="max-w-sm text-sm leading-6 text-white/52 sm:text-base">Real generations, original cover art, and music you can hear before you create.</p></div><div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:mt-14 lg:grid-cols-4">{tracks.map((track) => { const isPlaying = activeTrackId === track.id && playing; return <article key={track.id} className="group min-w-[78vw] snap-start overflow-hidden rounded-2xl border border-white/10 bg-[#111113] transition duration-200 hover:-translate-y-1 hover:border-white/20 sm:min-w-[20rem] md:min-w-0"><div className="relative aspect-square overflow-hidden bg-white/[.04]">{track.thumbnailSrc ? <Image src={track.thumbnailSrc} alt={`${track.title} album artwork`} fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 78vw" className="object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(184,118,217,.4),transparent_28%),linear-gradient(145deg,#20202a,#101014)]" />}<button type="button" onClick={() => void handleToggle(track)} aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`} aria-pressed={isPlaying} className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"><PlayIcon playing={isPlaying} /></button></div><div className="p-5"><p className="text-xs font-medium uppercase tracking-[.13em] text-white/40">Created with La Musica</p><div className="mt-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-medium text-white">{track.title}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-white/52">{track.description}</p></div><span className="shrink-0 text-xs tabular-nums text-white/45">{track.duration}</span></div></div></article>; })}</div>{errorMessage ? <p role="status" className="mt-4 text-sm text-red-200">{errorMessage}</p> : null}<audio ref={audioRef} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} className="hidden" /></div></section>;
}
