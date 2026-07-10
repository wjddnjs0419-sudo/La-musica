"use client";

import * as React from "react";

const VolumeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
    <path d="M4 10v4h4l5 4V6l-5 4H4z" fill="currentColor" />
    <path
      d="M16 9.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5M18.5 7c1.4 1.3 2.1 3 2.1 5s-.7 3.7-2.1 5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

type VolumeControlProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
};

export default function VolumeControl({
  volume,
  onVolumeChange,
}: VolumeControlProps) {
  return (
    <div className="hidden items-center gap-2 text-white/50 lg:flex">
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
    </div>
  );
}
