"use client";

type LyricLineProps = {
  text: string;
};

export default function LyricLine({ text }: LyricLineProps) {
  return (
    <p className="text-center text-base leading-relaxed text-white/65">
      {text}
    </p>
  );
}
