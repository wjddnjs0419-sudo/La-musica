export type ProgressStep = {
  percent: number;
  message: string;
};

export type GenerationPhase = "idle" | "generating" | "success" | "failed";

export function calcGenerationProgress(elapsedMs: number): ProgressStep {
  const s = elapsedMs / 1000;
  if (s < 10)
    return {
      percent: Math.round((s / 10) * 10),
      message: "Starting your song...",
    };
  if (s < 20)
    return {
      percent: 10 + Math.round(((s - 10) / 10) * 10),
      message: "Understanding your idea...",
    };
  if (s < 35)
    return {
      percent: 20 + Math.round(((s - 20) / 15) * 15),
      message: "Writing lyrics and shaping the music direction...",
    };
  if (s < 90)
    return {
      percent: 35 + Math.round(((s - 35) / 55) * 40),
      message: "Composing your track...",
    };
  if (s < 120)
    return {
      percent: 75 + Math.round(((s - 90) / 30) * 15),
      message: "Rendering audio...",
    };
  return {
    percent: Math.min(98, 90 + Math.round(((s - 120) / 60) * 8)),
    message: "Saving your song...",
  };
}
