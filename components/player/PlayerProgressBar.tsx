"use client";

import { formatTime } from "@/lib/player/time";

type PlayerProgressBarProps = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

export default function PlayerProgressBar({
  currentTime,
  duration,
  onSeek,
}: PlayerProgressBarProps) {
  const seekMax = duration || 1;
  const progressValue = duration ? Math.min(currentTime, duration) : 0;

  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3 px-3 pt-2">
      <span className="text-right text-[10px] tabular-nums text-white/45">
        {formatTime(currentTime)}
      </span>
      <div className="relative -my-3 py-3">
        <div className="relative h-1 bg-white/10">
          <progress
            value={progressValue}
            max={seekMax}
            aria-hidden
            className="absolute inset-0 h-1 w-full appearance-none overflow-hidden [&::-moz-progress-bar]:bg-white [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white"
          />
          <input
            type="range"
            min={0}
            max={seekMax}
            step={1}
            value={progressValue}
            disabled={!duration}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Seek track"
            className="absolute inset-x-0 -inset-y-3 h-[calc(100%+24px)] w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </div>
      </div>
      <span className="text-[10px] tabular-nums text-white/45">
        {duration ? formatTime(duration) : "--:--"}
      </span>
    </div>
  );
}
