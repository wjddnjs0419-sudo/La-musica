"use client";

import * as React from "react";
import { type GenerateRequest } from "@/lib/music";
import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

// --- Utility ---
type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

const GENRE_OPTIONS: { value: MusicGenre; label: string }[] = [
  { value: "edm", label: "EDM" },
  { value: "reggaeton", label: "Reggaeton" },
  { value: "hiphop_trap", label: "Hip-hop / Trap" },
  { value: "techno", label: "Techno" },
  { value: "korean_ballad", label: "Korean Ballad" },
  { value: "brazilian_funk", label: "Brazilian Funk" },
  { value: "afropop_festival", label: "Afropop Festival" },
  { value: "french_maghreb_hiphop", label: "French Maghreb Hip-hop" },
  { value: "football_chant", label: "Football Chant" },
];

const MOOD_OPTIONS: { value: MusicMood; label: string }[] = [
  { value: "hard", label: "Hard" },
  { value: "energetic", label: "Energetic" },
  { value: "dark", label: "Dark" },
  { value: "happy", label: "Happy" },
  { value: "emotional", label: "Emotional" },
  { value: "sexy", label: "Sexy" },
  { value: "epic", label: "Epic" },
  { value: "funny", label: "Funny" },
  { value: "nostalgic", label: "Nostalgic" },
  { value: "romantic", label: "Romantic" },
  { value: "aggressive", label: "Aggressive" },
  { value: "festival", label: "Festival" },
];

const USE_CASE_OPTIONS: { value: MusicUseCase; label: string }[] = [
  { value: "workout", label: "Workout" },
  { value: "club", label: "Club" },
  { value: "party", label: "Party" },
  { value: "short_form", label: "Short-form" },
  { value: "gaming", label: "Gaming" },
  { value: "travel_vlog", label: "Travel Vlog" },
  { value: "sports_chant", label: "Sports Chant" },
  { value: "comedy_roast", label: "Comedy Roast" },
  { value: "background", label: "Background" },
  { value: "personal_song", label: "Personal Song" },
];

// `value` is the English language name sent to the compiler (`sung in {value}`);
// "" = Auto (let the model pick). Labels show the native name for recognizability.
const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "English", label: "English" },
  { value: "Korean", label: "한국어" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Portuguese", label: "Português" },
  { value: "Arabic", label: "العربية" },
];

const VOCAL_OPTIONS: { value: VocalMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "instrumental", label: "Instrumental" },
  { value: "male_vocal", label: "Male vocal" },
  { value: "female_vocal", label: "Female vocal" },
  { value: "rap_vocal", label: "Rap vocal" },
  { value: "crowd_chant", label: "Crowd chant" },
];

// --- Minimal SVG icons ---
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

const LyricsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 8h14" />
    <path d="M5 12h10" />
    <path d="M5 16h7" />
  </svg>
);

const InstrumentalIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const CreditStackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    {...props}
  >
    <path
      d="M5 15.5 12 19l7-3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      opacity="0.55"
    />
    <path
      d="M5 11.5 12 15l7-3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      opacity="0.75"
    />
    <path
      d="M5 7.5 12 4l7 3.5-7 3.5-7-3.5Z"
      fill="currentColor"
      opacity="0.95"
    />
  </svg>
);

export interface PromptBoxProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit"> {
  /** Called with the composed generation request when the user submits. */
  onSend?: (payload: GenerateRequest) => void;
  remainingCredits?: number;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSend, remainingCredits = 0, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = React.useState("");
    const [lyrics, setLyrics] = React.useState("");
    const [lyricsOpen, setLyricsOpen] = React.useState(false);
    const [genre, setGenre] = React.useState<MusicGenre | "">("");
    const [moods, setMoods] = React.useState<MusicMood[]>([]);
    const [useCase, setUseCase] = React.useState<MusicUseCase | "">("");
    const [vocalMode, setVocalMode] = React.useState<VocalMode>("auto");
    const [language, setLanguage] = React.useState("");
    const [optionsOpen, setOptionsOpen] = React.useState(false);

    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
    React.useLayoutEffect(() => {
      const el = internalTextareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      props.onChange?.(e);
    };

    const hasValue = value.trim().length > 0;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = value.trim();
      if (!text) return;
      onSend?.({
        prompt: text,
        lyrics: lyrics.trim() || undefined,
        instrumental: vocalMode === "instrumental",
        genre: genre || undefined,
        moods: moods.length ? moods : undefined,
        useCase: useCase || undefined,
        vocalMode,
        language: language || undefined,
      });
      setValue("");
      setLyrics("");
      setGenre("");
      setMoods([]);
      setUseCase("");
      setVocalMode("auto");
      setLanguage("");
      setLyricsOpen(false);
      setOptionsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
      props.onKeyDown?.(e);
    };

    return (
      <form
        onSubmit={handleSubmit}
        className={cn(
          "dark flex flex-col rounded-[22px] border bg-white p-2 shadow-sm transition-colors dark:border-transparent dark:bg-[#303030] sm:rounded-[28px]",
          className,
        )}
      >
        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe your music..."
          className="custom-scrollbar min-h-12 w-full resize-none border-0 bg-transparent p-3 text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none dark:text-white dark:placeholder:text-gray-300"
          {...props}
        />

        {lyricsOpen && (
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Lyrics (optional)"
            rows={3}
            className="custom-scrollbar mx-1 mb-1 w-[calc(100%-0.5rem)] resize-none rounded-2xl border-0 bg-black/5 p-3 text-sm text-foreground dark:bg-white/5 dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none"
          />
        )}

        {optionsOpen && (
          <div className="mx-1 mb-1 grid grid-cols-1 gap-2 rounded-2xl bg-black/5 p-3 dark:bg-white/5 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Genre
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as MusicGenre | "")}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                <option value="">Auto</option>
                {GENRE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Vocal
              <select
                value={vocalMode}
                onChange={(e) => setVocalMode(e.target.value as VocalMode)}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                {VOCAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Language
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                <option value="">Auto</option>
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Use case
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value as MusicUseCase | "")}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                <option value="">Auto</option>
                {USE_CASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Mood
              <div className="flex flex-wrap gap-1" role="group" aria-label="Mood">
                {MOOD_OPTIONS.map((o) => {
                  const active = moods.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setMoods((prev) =>
                          prev.includes(o.value)
                            ? prev.filter((m) => m !== o.value)
                            : [...prev, o.value],
                        )
                      }
                      aria-pressed={active}
                      className={cn(
                        "rounded-full px-2 py-1 text-xs transition-colors",
                        active
                          ? "bg-[#2294ff] text-white dark:bg-[#99ceff] dark:text-black"
                          : "bg-white/70 text-foreground dark:bg-[#3a3a3a] dark:text-white",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 p-1 pt-0 sm:gap-2">
          <button
            type="button"
            onClick={() => setLyricsOpen((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors focus-visible:outline-none",
              lyricsOpen
                ? "dark:text-[#99ceff] text-[#2294ff] dark:bg-[#3b4045] bg-accent"
                : "text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#515151]",
            )}
          >
            <LyricsIcon className="h-4 w-4" />
            Lyrics
          </button>

          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-pressed={optionsOpen}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors focus-visible:outline-none",
              optionsOpen
                ? "dark:text-[#99ceff] text-[#2294ff] dark:bg-[#3b4045] bg-accent"
                : "text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#515151]",
            )}
          >
            <InstrumentalIcon className="h-4 w-4" />
            Options
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div
              className="flex h-8 shrink-0 items-center gap-1.5 px-1 text-sm text-foreground dark:text-white"
              title="Remaining credits"
            >
              <CreditStackIcon className="h-4 w-4 opacity-80" />
              <span className="font-medium tabular-nums">{remainingCredits}</span>
            </div>

            <button
              type="submit"
              disabled={!hasValue}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80 disabled:bg-black/40 dark:disabled:bg-[#515151]"
            >
              <SendIcon className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </button>
          </div>
        </div>
      </form>
    );
  },
);
PromptBox.displayName = "PromptBox";
