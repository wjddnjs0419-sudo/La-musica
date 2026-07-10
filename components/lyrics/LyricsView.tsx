"use client";

import * as React from "react";
import LyricLine from "@/components/lyrics/LyricLine";
import { findActiveLineIndex, type LyricLine as LyricLineType } from "@/lib/player/lyrics";

type LyricsViewProps = {
  lines: LyricLineType[];
  currentTimeMs: number;
  instrumental?: boolean;
};

export default function LyricsView({
  lines,
  currentTimeMs,
  instrumental = false,
}: LyricsViewProps) {
  const activeIdx = findActiveLineIndex(lines, currentTimeMs);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const activeLyricRef = React.useRef<HTMLParagraphElement>(null);
  const [userScrolling, setUserScrolling] = React.useState(false);
  const userScrollTimerRef = React.useRef<number | null>(null);

  // Scroll the lyrics container directly — scrollIntoView propagates up to parent
  // scroll contexts (body on iOS Safari) and causes the fullscreen player to jump.
  React.useEffect(() => {
    const container = containerRef.current;
    const line = activeLyricRef.current;
    if (!container || !line || userScrolling) return;
    const target = line.offsetTop - container.clientHeight / 2 + line.offsetHeight / 2;
    container.scrollTo({ top: target, behavior: "smooth" });
  }, [activeIdx, userScrolling]);

  const handleScroll = React.useCallback(() => {
    setUserScrolling(true);
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = window.setTimeout(
      () => setUserScrolling(false),
      3000,
    );
  }, []);

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
    <div
      ref={containerRef}
      className="custom-scrollbar h-full overflow-y-auto px-6"
      onScroll={handleScroll}
    >
      <div className="space-y-3 py-6">
        {lines.map((line, i) => (
          <LyricLine
            key={i}
            text={line.text}
            active={i === activeIdx}
            nearActive={Math.abs(i - activeIdx) <= 2}
            lineRef={i === activeIdx ? activeLyricRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}
