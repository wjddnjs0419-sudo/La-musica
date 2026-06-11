"use client";

import * as React from "react";
import { type GenerateRequest } from "@/lib/music";

// --- Utility ---
type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

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

const StyleIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M6 20V11" />
    <path d="M12 20V4" />
    <path d="M18 20v-6" />
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

export interface PromptBoxProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onSubmit"> {
  /** Called with the composed generation request when the user submits. */
  onSend?: (payload: GenerateRequest) => void;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSend, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = React.useState("");
    const [lyrics, setLyrics] = React.useState("");
    const [style, setStyle] = React.useState("");
    const [lyricsOpen, setLyricsOpen] = React.useState(false);
    const [styleOpen, setStyleOpen] = React.useState(false);
    const [instrumental, setInstrumental] = React.useState(false);

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
        style: style.trim() || undefined,
        instrumental,
      });
      setValue("");
      setLyrics("");
      setStyle("");
      setLyricsOpen(false);
      setStyleOpen(false);
      setInstrumental(false);
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
          "dark flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text",
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
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12"
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

        {styleOpen && (
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Style (e.g. lo-fi, orchestral, synthwave)"
            className="mx-1 mb-1 w-[calc(100%-0.5rem)] rounded-2xl border-0 bg-black/5 p-3 text-sm text-foreground dark:bg-white/5 dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-400 focus:ring-0 focus-visible:outline-none"
          />
        )}

        <div className="mt-0.5 flex items-center gap-2 p-1 pt-0">
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
            onClick={() => setStyleOpen((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors focus-visible:outline-none",
              styleOpen
                ? "dark:text-[#99ceff] text-[#2294ff] dark:bg-[#3b4045] bg-accent"
                : "text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#515151]",
            )}
          >
            <StyleIcon className="h-4 w-4" />
            Style
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInstrumental((v) => !v)}
              aria-pressed={instrumental}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors focus-visible:outline-none",
                instrumental
                  ? "dark:text-[#99ceff] text-[#2294ff] dark:bg-[#3b4045] bg-accent"
                  : "text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#515151]",
              )}
            >
              <InstrumentalIcon className="h-4 w-4" />
              Instrumental
            </button>

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
