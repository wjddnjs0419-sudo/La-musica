export type MusicGenerationRequest = {
  prompt: string;
  lyrics?: string;
  instrumental: boolean;
  duration?: number;
};

export type StartedMusicGeneration = {
  provider: string;
  jobId: string;
  model: string;
  effectivePrompt: string;
  durationSeconds: number;
  estimatedMusicCostUsd: number;
};

export type MusicGenerationStatus =
  | { state: "pending" }
  | { state: "succeeded"; audioUrl: string }
  | { state: "failed"; error: string };

export type GenerationReference = {
  provider: string;
  jobId: string;
  model: string;
};

export interface MusicGenerationProvider {
  readonly id: string;
  readonly model: string;
  start(request: MusicGenerationRequest): Promise<StartedMusicGeneration>;
  getStatus(jobId: string): Promise<MusicGenerationStatus>;
}
