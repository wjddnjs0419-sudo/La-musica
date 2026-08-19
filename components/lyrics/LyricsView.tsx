"use client";

import LyricLine from "@/components/lyrics/LyricLine";
import { type LyricLine as LyricLineType } from "@/lib/player/lyrics";

type LyricsViewProps = {
  lines: LyricLineType[];
  instrumental?: boolean;
};

export default function LyricsView({
  lines,
  instrumental = false,
}: LyricsViewProps) {
  if (instrumental || !lines.length) {
    return (
      <div className="flex h-full min-h-24 items-center justify-center">
        <p className="text-sm text-white/30">
          {instrumental ? "Instrumental track" : "No lyrics available for this track."}
        </p>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto px-6">
      <div className="space-y-3 py-6">
        {lines.map((line, i) => (
          <LyricLine key={i} text={line.text} />
        ))}
      </div>
    </div>
  );
}
