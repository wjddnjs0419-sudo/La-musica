"use client";

import * as React from "react";

import { LyricsAssistantModal } from "@/components/lyrics/LyricsAssistantModal";
import MusicThumbnail from "@/components/music-thumbnail";
import type { GenerationPhase, RefundStatus } from "@/lib/generation/progress";
import { calcGenerationProgress } from "@/lib/generation/progress";
import type { GenerateRequest, Music } from "@/lib/music";
import type {
  MusicGenre,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";
import { formatDuration } from "@/lib/player/time";
import {
  buildCreateSongRequest,
  CREATE_SONG_INITIAL_STATE,
  CREATE_SONG_PRESETS,
  GENRE_OPTIONS,
  LANGUAGE_OPTIONS,
  MOOD_OPTIONS,
  toggleMoodSelection,
  USE_CASE_OPTIONS,
  VOCAL_OPTIONS,
  type CreateSongFormState,
} from "@/lib/workspace/create-song";

type CreateSongModalProps = {
  open: boolean;
  phase: GenerationPhase;
  readyMusic: Music | null;
  refundStatus: RefundStatus;
  remainingCredits: number;
  generationStartMs: number;
  error: string | null;
  onSubmit: (payload: GenerateRequest) => void;
  onClose: () => void;
  onOpenCreditModal: () => void;
  onListenNow: (music: Music) => void;
  onReturnToEditor: () => void;
};

const STEPS = ["Lyrics", "Sound", "Create"] as const;
const GENERATION_COST = 1;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function CreateSongModal({
  open,
  phase,
  readyMusic,
  refundStatus,
  remainingCredits,
  generationStartMs,
  error,
  onSubmit,
  onClose,
  onOpenCreditModal,
  onListenNow,
  onReturnToEditor,
}: CreateSongModalProps) {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState<CreateSongFormState>(
    CREATE_SONG_INITIAL_STATE,
  );
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [lyricsAssistantOpen, setLyricsAssistantOpen] = React.useState(false);
  const [lyricsMode, setLyricsMode] = React.useState<"write" | "ai">("write");
  const [lyricsIdea, setLyricsIdea] = React.useState("");
  const [soundMode, setSoundMode] = React.useState<"simple" | "advanced">(
    "simple",
  );
  const [elapsedMs, setElapsedMs] = React.useState(0);

  React.useEffect(() => {
    if (!open || phase !== "generating") return;
    const update = () =>
      setElapsedMs(Math.max(0, Date.now() - generationStartMs));
    update();
    const interval = window.setInterval(update, 500);
    return () => window.clearInterval(interval);
  }, [generationStartMs, open, phase]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && phase !== "generating") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, phase]);

  if (!open) return null;

  const updateForm = (patch: Partial<CreateSongFormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const canContinue = step === 1 || form.prompt.trim().length > 0;
  const progress = calcGenerationProgress(elapsedMs);

  const goToEditor = () => {
    setStep(3);
    onReturnToEditor();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && phase !== "generating")
          onClose();
      }}
    >
      <section
        aria-label="Create song"
        aria-modal="true"
        role="dialog"
        className="relative flex h-[min(760px,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#101011] text-[#f4f1ea] shadow-2xl shadow-black/60 sm:h-[min(860px,calc(100dvh-6rem))] sm:max-h-[90dvh] sm:rounded-2xl"
      >
        {phase === "generating" ? (
          <GeneratingState progress={progress} onClose={onClose} />
        ) : phase === "success" && readyMusic ? (
          <ReadyState
            music={readyMusic}
            onClose={onClose}
            onListenNow={onListenNow}
          />
        ) : phase === "failed" ? (
          <FailureState
            refundStatus={refundStatus}
            onTryAgain={goToEditor}
            onEditPrompt={goToEditor}
            onClose={onClose}
          />
        ) : (
          <>
            <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">
                  New generation
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">
                  Create song
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close create song"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/55 transition hover:bg-white/[.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25"
              >
                ×
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[190px_minmax(0,1fr)]">
              <StepNavigation step={step} onStepChange={setStep} />
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8">
                  {step === 1 && (
                  <LyricsStep
                    form={form}
                    updateForm={updateForm}
                    mode={lyricsMode}
                    idea={lyricsIdea}
                    onModeChange={setLyricsMode}
                    onIdeaChange={setLyricsIdea}
                    onOpenAssistant={() => setLyricsAssistantOpen(true)}
                  />
                )}
                  {step === 2 && (
                  <SoundStep
                    form={form}
                    updateForm={updateForm}
                    advancedOpen={advancedOpen}
                    onToggleAdvanced={() => setAdvancedOpen((value) => !value)}
                    mode={soundMode}
                    onModeChange={setSoundMode}
                  />
                )}
                  {step === 3 && (
                  <CreateStep remainingCredits={remainingCredits} />
                )}
                  {error && (
                  <p className="mt-5 rounded-lg border border-red-400/20 bg-red-400/[.08] px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                )}
                </div>
                <footer className="flex shrink-0 items-center justify-between border-t border-white/10 px-5 py-4 sm:px-7 sm:py-5">
                  <button
                    type="button"
                    onClick={() =>
                      setStep((current) => Math.max(1, current - 1))
                    }
                    disabled={step === 1}
                    className="text-sm text-white/50 transition hover:text-white disabled:pointer-events-none disabled:opacity-30"
                  >
                    Back
                  </button>
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setStep((current) => Math.min(3, current + 1))
                      }
                      disabled={!canContinue}
                      className="rounded-full bg-[#f4f1ea] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:pointer-events-none disabled:opacity-35"
                    >
                      Continue
                    </button>
                  ) : remainingCredits < GENERATION_COST ? (
                    <button
                      type="button"
                      onClick={onOpenCreditModal}
                      className="rounded-full bg-[#f4f1ea] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
                    >
                      Get credits
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSubmit(buildCreateSongRequest(form))}
                      disabled={!canContinue}
                      className="rounded-full bg-[#f4f1ea] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white disabled:pointer-events-none disabled:opacity-35"
                    >
                      Create song · {GENERATION_COST} credit
                    </button>
                  )}
                </footer>
              </div>
            </div>
          </>
        )}
      </section>
      <LyricsAssistantModal
        open={lyricsAssistantOpen}
        onClose={() => setLyricsAssistantOpen(false)}
        context={{
          prompt: lyricsIdea.trim() || form.prompt.trim() || undefined,
          genre: form.genre || undefined,
          moods: form.moods.length ? form.moods : undefined,
          vocalMode: form.vocalMode,
          language: form.language || undefined,
          useCase: form.useCase || undefined,
        }}
        currentLyrics={form.lyrics}
        initialInstruction={form.lyrics.trim() ? "" : lyricsIdea}
        onApply={(lyrics) => updateForm({ lyrics })}
      />
    </div>
  );
}

function StepNavigation({
  step,
  onStepChange,
}: {
  step: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav
      aria-label="Create song steps"
      className="flex shrink-0 border-b border-white/10 px-3 py-3 md:flex-col md:justify-start md:gap-2 md:border-b-0 md:border-r md:px-5 md:py-6"
    >
      {STEPS.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onStepChange(number)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-sm transition md:min-h-12 md:w-full md:flex-none md:justify-start md:px-3",
              active
                ? "bg-white text-black"
                : "text-white/45 hover:bg-white/[.06] hover:text-white",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border text-[10px]",
                active ? "border-black/25" : "border-white/20",
              )}
            >
              {number}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LyricsStep({
  form,
  updateForm,
  mode,
  idea,
  onModeChange,
  onIdeaChange,
  onOpenAssistant,
}: {
  form: CreateSongFormState;
  updateForm: (patch: Partial<CreateSongFormState>) => void;
  mode: "write" | "ai";
  idea: string;
  onModeChange: (mode: "write" | "ai") => void;
  onIdeaChange: (idea: string) => void;
  onOpenAssistant: () => void;
}) {
  return (
    <div>
      <Eyebrow>Lyrics</Eyebrow>
      <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
        How do you want to start?
      </h3>
      <div className="mt-6 inline-flex border border-white/15 bg-white/[.03] p-1">
        <button
          type="button"
          onClick={() => onModeChange("write")}
          className={cn(
            "px-4 py-2.5 text-sm transition",
            mode === "write"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white",
          )}
        >
          Write my own lyrics
        </button>
        <button
          type="button"
          onClick={() => onModeChange("ai")}
          className={cn(
            "px-4 py-2.5 text-sm transition",
            mode === "ai"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white",
          )}
        >
          Generate with AI
        </button>
      </div>
      {mode === "write" ? (
        <div className="mt-7">
          <label className="text-sm font-medium">Your lyrics</label>
          <textarea
            value={form.lyrics}
            onChange={(event) => updateForm({ lyrics: event.target.value })}
            rows={11}
            placeholder="Write or paste your lyrics here..."
            className="mt-3 w-full resize-none border border-white/15 bg-white/[.04] p-4 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-white/35"
          />
        </div>
      ) : (
        <div className="mt-7">
          <label className="text-sm font-medium">
            What should the song be about?
          </label>
          <textarea
            value={idea}
            onChange={(event) => onIdeaChange(event.target.value)}
            rows={4}
            placeholder="e.g. A nostalgic summer love song about a night in Barcelona"
            className="mt-3 w-full resize-none border border-white/15 bg-white/[.04] p-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/35"
          />
          <button
            type="button"
            onClick={onOpenAssistant}
            disabled={!idea.trim()}
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:pointer-events-none disabled:opacity-35"
          >
            Generate lyrics
          </button>
          <div className="mt-7">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Generated lyrics</label>
              {form.lyrics && (
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="text-xs text-white/50 underline underline-offset-4 transition hover:text-white"
                >
                  Refine with AI
                </button>
              )}
            </div>
            <textarea
              value={form.lyrics}
              onChange={(event) => updateForm({ lyrics: event.target.value })}
              rows={9}
              placeholder="Your AI-generated lyrics will appear here..."
              className="mt-3 w-full resize-none border border-white/15 bg-white/[.04] p-4 text-sm leading-6 text-white outline-none placeholder:text-white/30 focus:border-white/35"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SoundStep({
  form,
  updateForm,
  advancedOpen,
  onToggleAdvanced,
  mode,
  onModeChange,
}: {
  form: CreateSongFormState;
  updateForm: (patch: Partial<CreateSongFormState>) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  mode: "simple" | "advanced";
  onModeChange: (mode: "simple" | "advanced") => void;
}) {
  const applyPreset = (preset: (typeof CREATE_SONG_PRESETS)[number]) =>
    updateForm({
      genre: preset.genre ?? "",
      moods: preset.moods ?? [],
      useCase: preset.useCase ?? "",
      vocalMode: preset.vocalMode ?? "auto",
      duration: preset.duration ?? 180,
    });
  return (
    <div>
      <Eyebrow>Sound</Eyebrow>
      <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
        Shape your sound
      </h3>
      <p className="mt-2 text-sm text-white/45">
        Choose the sound, mood, and voice for your track.
      </p>
      <div className="mt-6 inline-flex border border-white/15 bg-white/[.03] p-1">
        <button
          type="button"
          onClick={() => onModeChange("simple")}
          className={cn(
            "px-4 py-2.5 text-sm transition",
            mode === "simple"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white",
          )}
        >
          Simple
        </button>
        <button
          type="button"
          onClick={() => onModeChange("advanced")}
          className={cn(
            "px-4 py-2.5 text-sm transition",
            mode === "advanced"
              ? "bg-white text-black"
              : "text-white/55 hover:text-white",
          )}
        >
          Advanced
        </button>
      </div>
      {mode === "simple" ? (
        <label className="mt-7 block text-sm font-medium">
          Describe your sound <span className="text-white/40">*</span>
          <textarea
            value={form.prompt}
            onChange={(event) => updateForm({ prompt: event.target.value })}
            rows={7}
            placeholder="e.g. Dreamy indie pop with warm female vocals and a nostalgic late-night feel"
            className="mt-3 w-full resize-none border border-white/15 bg-white/[.04] p-4 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-white/35"
          />
        </label>
      ) : (
        <>
          <label className="mt-7 block text-sm font-medium">
            Describe your sound <span className="text-white/40">*</span>
            <textarea
              value={form.prompt}
              onChange={(event) => updateForm({ prompt: event.target.value })}
              rows={4}
              placeholder="e.g. Dreamy indie pop with warm female vocals and a nostalgic late-night feel"
              className="mt-3 w-full resize-none border border-white/15 bg-white/[.04] p-4 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-white/35"
            />
          </label>
          <Field label="Genre">
            <ChipGroup
              options={GENRE_OPTIONS}
              selected={form.genre}
              onSelect={(genre) => updateForm({ genre: genre as MusicGenre })}
              allowEmpty
            />
          </Field>
          <Field label="Mood" hint="Choose up to 3">
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={form.moods.includes(option.value)}
                  disabled={
                    !form.moods.includes(option.value) && form.moods.length >= 3
                  }
                  onClick={() =>
                    updateForm({
                      moods: toggleMoodSelection(form.moods, option.value),
                    })
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Vocal">
            <Segmented
              options={VOCAL_OPTIONS}
              value={form.vocalMode}
              onChange={(vocalMode) =>
                updateForm({ vocalMode: vocalMode as VocalMode })
              }
            />
          </Field>
          {form.vocalMode === "instrumental" && form.lyrics.trim() && (
            <p className="-mt-3 mb-5 text-xs text-white/40">
              Lyrics won&apos;t be used for this generation.
            </p>
          )}
          <Field label="Duration">
            <Segmented
              options={[
                { value: "60", label: "Short · 1 min" },
                { value: "180", label: "Full · 3 min" },
              ]}
              value={String(form.duration)}
              onChange={(value) =>
                updateForm({ duration: Number(value) as 60 | 180 })
              }
            />
          </Field>
          <label className="mb-6 block text-sm font-medium">
            Anything else about the sound?{" "}
            <span className="ml-1 text-xs font-normal text-white/35">
              Optional
            </span>
            <textarea
              value={form.soundDirection}
              onChange={(event) =>
                updateForm({ soundDirection: event.target.value })
              }
              rows={3}
              placeholder="e.g. warm piano, soft drums, late-night atmosphere"
              className="mt-3 w-full resize-none rounded-xl border border-white/15 bg-white/[.04] p-3 text-sm font-normal text-white outline-none placeholder:text-white/30 focus:border-white/35"
            />
          </label>
          <button
            type="button"
            onClick={onToggleAdvanced}
            aria-expanded={advancedOpen}
            className="flex w-full items-center justify-between border-t border-white/10 py-4 text-sm font-medium text-white/75"
          >
            Advanced settings <span>{advancedOpen ? "−" : "+"}</span>
          </button>
          {advancedOpen && (
            <div className="space-y-6 border-b border-white/10 pb-6">
              <Field label="Language">
                <Select
                  value={form.language}
                  onChange={(language) => updateForm({ language })}
                  options={LANGUAGE_OPTIONS}
                />
              </Field>
              <Field label="Use case">
                <Select
                  value={form.useCase}
                  onChange={(useCase) =>
                    updateForm({ useCase: useCase as MusicUseCase | "" })
                  }
                  options={USE_CASE_OPTIONS}
                />
              </Field>
              <Field label="Quick presets">
                <div className="flex flex-wrap gap-2">
                  {CREATE_SONG_PRESETS.map((preset) => (
                    <Chip
                      key={preset.label}
                      active={false}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateStep({ remainingCredits }: { remainingCredits: number }) {
  const enough = remainingCredits >= GENERATION_COST;
  return (
    <div>
      <Eyebrow>Create</Eyebrow>
      <h3 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
        Ready to create?
      </h3>
      <p className="mt-2 text-sm text-white/45">
        Your song will be added to My music when generation is complete.
      </p>
      <div className="mt-8 space-y-4 border-y border-white/10 py-5 text-sm">
        <div className="flex justify-between">
          <span className="text-white/45">Credits required</span>
          <strong>{GENERATION_COST} credit</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-white/45">Available now</span>
          <strong>{remainingCredits} credits</strong>
        </div>
      </div>
      <p
        className={cn(
          "mt-5 text-xs",
          enough ? "text-white/35" : "text-amber-200/80",
        )}
      >
        {enough
          ? "Credits are used only after you choose Create."
          : `You need ${GENERATION_COST} credit. ${remainingCredits} available.`}
      </p>
    </div>
  );
}

function GeneratingState({
  progress,
  onClose,
}: {
  progress: { percent: number; message: string };
  onClose: () => void;
}) {
  return (
    <div className="relative flex min-h-[560px] flex-1 overflow-hidden">
      <video
        src="/videos/workspace-generation.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,5,5,.25),rgba(5,5,5,.82))]" />
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-8 text-center">
        <Eyebrow>La Musica</Eyebrow>
        <h2 className="mt-5 text-4xl font-medium tracking-[-0.05em]">
          Creating your song
        </h2>
        <p className="mt-4 text-sm text-white/70">{progress.message}</p>
        <div className="mt-12 w-full max-w-sm">
          <div className="h-px bg-white/30">
            <div
              className="h-full bg-[#f4f1ea] transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-4 text-sm tabular-nums text-white/70">
            {progress.percent}% <span className="text-white/35">estimated</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-16 text-sm text-white/55 underline decoration-white/25 underline-offset-4 transition hover:text-white"
        >
          Back to My music
        </button>
      </div>
    </div>
  );
}

function ReadyState({
  music,
  onClose,
  onListenNow,
}: {
  music: Music;
  onClose: () => void;
  onListenNow: (music: Music) => void;
}) {
  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center px-8 text-center">
      <Eyebrow>Your song is ready</Eyebrow>
      <MusicThumbnail
        track={music}
        className="mt-7 h-40 w-40 rounded-xl"
        showTitle={false}
      />
      <h2 className="mt-7 text-3xl font-medium tracking-[-0.05em]">
        {music.title}
      </h2>
      <p className="mt-2 text-sm text-white/45">
        {formatDuration(music.duration_seconds)}
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => onListenNow(music)}
          className="rounded-full bg-[#f4f1ea] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
        >
          Listen now
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-white/50 hover:text-white"
        >
          Back to My music
        </button>
      </div>
    </div>
  );
}

function FailureState({
  refundStatus,
  onTryAgain,
  onEditPrompt,
  onClose,
}: {
  refundStatus: RefundStatus;
  onTryAgain: () => void;
  onEditPrompt: () => void;
  onClose: () => void;
}) {
  const refundMessage =
    refundStatus === "refunded"
      ? "Your credit has been returned."
      : refundStatus === "failed"
        ? "We couldn't confirm the credit refund yet. Please contact support if your credit does not return."
        : "Your credit refund is being processed.";

  return (
    <div className="flex min-h-[560px] flex-col items-center justify-center px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-400/[.08] text-xl text-red-200">
        !
      </div>
      <h2 className="mt-6 text-2xl font-medium tracking-[-0.04em]">
        Music generation failed
      </h2>
      <p className="mt-2 text-sm text-white/50">
        We couldn&apos;t finish this song.
      </p>
      <p className="mt-2 max-w-sm text-sm text-white/75">{refundMessage}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-full bg-[#f4f1ea] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onEditPrompt}
          className="rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/80 transition hover:border-white/50 hover:text-white"
        >
          Edit prompt
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 text-xs text-white/40 transition hover:text-white/70"
        >
          Back to workspace
        </button>
      </div>
      {refundStatus === "failed" && (
        <a
          href="/contact"
          className="mt-5 text-xs text-white/40 underline underline-offset-4 transition hover:text-white/70"
        >
          Contact support
        </a>
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
      {children}
    </p>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium">{label}</h4>
        {hint && <span className="text-xs text-white/35">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-white bg-white text-black"
          : "border-white/15 text-white/65 hover:border-white/35 hover:text-white",
        disabled &&
          "cursor-not-allowed opacity-30 hover:border-white/15 hover:text-white/65",
      )}
    >
      {children}
    </button>
  );
}
function ChipGroup({
  options,
  selected,
  onSelect,
  allowEmpty,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowEmpty && (
        <Chip active={!selected} onClick={() => onSelect("")}>
          Auto
        </Chip>
      )}
      {options.map((option) => (
        <Chip
          key={option.value}
          active={selected === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
function Segmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl border border-white/15 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-2 text-sm transition",
            value === option.value
              ? "bg-white text-black"
              : "text-white/50 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-white/15 bg-white/[.04] px-3 py-2.5 text-sm text-white outline-none focus:border-white/35"
    >
      <option value="">Auto</option>
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-[#101011]"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
