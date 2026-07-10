"use client";

import * as React from "react";

type LyricLineProps = {
  text: string;
  active: boolean;
  nearActive: boolean;
  lineRef?: React.Ref<HTMLParagraphElement>;
};

export default function LyricLine({
  text,
  active,
  nearActive,
  lineRef,
}: LyricLineProps) {
  return (
    <p
      ref={lineRef}
      className={`text-center text-base leading-relaxed transition-all duration-300 ${
        active
          ? "font-semibold text-white/95"
          : nearActive
            ? "text-white/40"
            : "text-white/20"
      }`}
    >
      {text}
    </p>
  );
}
