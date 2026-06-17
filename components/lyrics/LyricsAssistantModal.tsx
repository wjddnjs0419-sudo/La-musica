"use client";

import * as React from "react";
import type {
  LyricsChatMessage,
  LyricsContext,
  LyricsResult,
} from "@/lib/lyrics-assistant/prompt";

export interface LyricsAssistantModalProps {
  open: boolean;
  onClose: () => void;
  /** Current workspace song settings, used to ground the first draft. */
  context: LyricsContext;
  /** Current value of the Lyrics textarea, if any. */
  currentLyrics: string;
  /** Apply the latest AI lyrics to the workspace Lyrics textarea. */
  onApply: (lyrics: string) => void;
}

// One visible chat turn. `result` is attached to assistant turns for preview.
interface DisplayTurn {
  role: "user" | "assistant";
  text: string;
  result?: LyricsResult;
}

const ERROR_MESSAGES: Record<string, string> = {
  gemini_unconfigured: "AI lyrics isn't configured yet (missing server key).",
  gemini_bad_output: "Couldn't read the AI response. Please try again.",
  gemini_failed: "The AI lyrics request failed. Please try again shortly.",
  unauthorized: "Please sign in to use AI lyrics.",
  nothing_to_write: "Add a song description or an instruction first.",
};

export function LyricsAssistantModal({
  open,
  onClose,
  context,
  currentLyrics,
  onApply,
}: LyricsAssistantModalProps) {
  const [turns, setTurns] = React.useState<DisplayTurn[]>([]);
  // Conversation as sent to the API: user feedback + assistant JSON results.
  const [apiMessages, setApiMessages] = React.useState<LyricsChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const latestResult = React.useMemo(
    () => [...turns].reverse().find((t) => t.result)?.result ?? null,
    [turns],
  );
  const hasStarted = turns.length > 0;

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, loading]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function send(feedback: string) {
    const trimmed = feedback.trim();
    if (loading) return;
    if (hasStarted && !trimmed) return; // need an instruction once a draft exists

    setError(null);
    setLoading(true);

    const nextApiMessages: LyricsChatMessage[] = trimmed
      ? [...apiMessages, { role: "user", content: trimmed }]
      : [...apiMessages];

    if (trimmed) setTurns((t) => [...t, { role: "user", text: trimmed }]);
    setInput("");

    try {
      const res = await fetch("/api/lyrics/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextApiMessages,
          context,
          currentLyrics: currentLyrics || undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | (LyricsResult & { error?: undefined })
        | { error: string }
        | null;

      if (!res.ok || !data || "error" in data) {
        const code = (data && "error" in data && data.error) || "gemini_failed";
        setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.gemini_failed);
        return;
      }

      const result = data as LyricsResult;
      setApiMessages([
        ...nextApiMessages,
        { role: "assistant", content: JSON.stringify(result) },
      ]);
      setTurns((t) => [
        ...t,
        { role: "assistant", text: result.notes || "Lyrics ready.", result },
      ]);
    } catch {
      setError(ERROR_MESSAGES.gemini_failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="AI Lyrics Assistant"
    >
      <div
        className="dark flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-[#262626] sm:h-[80vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={onClose} />

        <div
          ref={scrollRef}
          className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4"
        >
          {!hasStarted && <EmptyState />}

          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <UserBubble key={i} text={turn.text} />
            ) : (
              <AssistantMessage key={i} text={turn.text} result={turn.result} />
            ),
          )}

          {loading && <LoadingRow />}
          {error && <ErrorRow message={error} />}
        </div>

        <ModalFooter
          input={input}
          onInputChange={setInput}
          onSend={() => void send(input)}
          onApply={
            latestResult
              ? () => {
                  onApply(latestResult.lyrics);
                  onClose();
                }
              : undefined
          }
          loading={loading}
          hasStarted={hasStarted}
        />
      </div>
    </div>
  );
}

// --- Presentational subcomponents (Tailwind only, no inline styles) ---

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
      <div className="flex items-center gap-2">
        <SparkleIcon className="h-5 w-5 text-[#2294ff] dark:text-[#99ceff]" />
        <h2 className="text-sm font-semibold text-foreground dark:text-white">
          AI Lyrics Assistant
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
        aria-label="Close"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <SparkleIcon className="h-8 w-8 text-[#2294ff] dark:text-[#99ceff]" />
      <p className="text-sm text-muted-foreground dark:text-gray-400">
        I&apos;ll write lyrics based on your current song settings.
        <br />
        Generate right away, or describe the direction you want.
      </p>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-[#2294ff] px-3 py-2 text-sm text-white">
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({
  text,
  result,
}: {
  text: string;
  result?: LyricsResult;
}) {
  return (
    <div className="flex flex-col gap-2">
      {result && <LyricsCard result={result} />}
      {text && (
        <p className="px-1 text-xs text-muted-foreground dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  );
}

function LyricsCard({ result }: { result: LyricsResult }) {
  return (
    <div className="rounded-2xl bg-black/5 p-3 dark:bg-white/5">
      {result.title && (
        <p className="mb-1 text-sm font-semibold text-foreground dark:text-white">
          {result.title}
        </p>
      )}
      {result.hook && (
        <p className="mb-2 text-xs italic text-[#2294ff] dark:text-[#99ceff]">
          🎵 {result.hook}
        </p>
      )}
      <pre className="custom-scrollbar max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm text-foreground dark:text-gray-200">
        {result.lyrics}
      </pre>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground dark:text-gray-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
      Writing lyrics…
    </div>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </div>
  );
}

function ModalFooter({
  input,
  onInputChange,
  onSend,
  onApply,
  loading,
  hasStarted,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onApply?: () => void;
  loading: boolean;
  hasStarted: boolean;
}) {
  return (
    <div className="border-t border-black/10 p-3 dark:border-white/10">
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
        >
          <CheckIcon className="h-4 w-4" />
          Apply to Lyrics
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          rows={1}
          placeholder={
            hasStarted
              ? "e.g. catchier chorus, make it for TikTok, translate to Portuguese…"
              : "Direction (optional) — leave empty to generate from settings"
          }
          className="custom-scrollbar max-h-28 min-h-10 flex-1 resize-none rounded-2xl border-0 bg-black/5 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none dark:bg-white/5 dark:text-white dark:placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || (hasStarted && !input.trim())}
          className="flex h-10 shrink-0 items-center justify-center rounded-full bg-[#2294ff] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2294ff]/85 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          {hasStarted ? "Revise" : "Generate"}
        </button>
      </form>
    </div>
  );
}

// --- Icons ---

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm6 11l.9 2.6L21.5 16l-2.6.9L18 19.5l-.9-2.6L14.5 16l2.6-.9L18 13zM6 14l.7 2 2 .7-2 .7L6 19.4l-.7-2-2-.7 2-.7L6 14z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
