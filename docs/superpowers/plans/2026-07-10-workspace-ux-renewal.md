# La Musica Workspace UX Renewal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renew Workspace UX — remove status badges, redesign mobile player, add immersive generation progress screen, trustworthy failure/refund screen, and full-screen lyrics player.

**Architecture:** Touch 3 existing files for P0 wins (lib/music.ts, music-workspace.tsx, workspace-music-player.tsx) and 1 API route (app/api/music/[id]/route.ts); add 3 new React components (generation-progress-modal.tsx, failure-modal.tsx, fullscreen-player.tsx). P1 wires fullscreen player into existing player + workspace.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript, vitest for logic tests, `npm run build` + `npm run lint` for component gates.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `lib/music.ts` | Add `RefundStatus`, `LyricLine` types + `approximateLyricTimings` helper |
| Modify | `components/music-workspace.tsx` | Remove badge; wire progress/failure/fullscreen modals |
| Modify | `components/workspace-music-player.tsx` | Hide volume on mobile; add `onOpenFullscreen` prop |
| Modify | `app/api/music/[id]/route.ts` | Write `refund_status` to metadata on prediction failure |
| Create | `components/generation-progress-modal.tsx` | Immersive progress overlay during generation |
| Create | `components/failure-modal.tsx` | Failure screen with refund status |
| Create | `components/fullscreen-player.tsx` | Full-screen player with active-lyric highlight |

---

## P0 Phase — Ship First

### Task 1: Add RefundStatus + LyricLine types + approximateLyricTimings to lib/music.ts

**Files:**
- Modify: `lib/music.ts` (after line 31, after `ThumbnailStatus`)
- Test: `lib/music.test.ts`

- [ ] **Step 1: Add types and helper to lib/music.ts**

After line 31 in `lib/music.ts` (after the `ThumbnailStatus` line), insert:

```ts
export type RefundStatus = "not_required" | "pending" | "refunded" | "failed";

export type LyricLine = {
  startMs: number;
  endMs?: number;
  text: string;
};

export function approximateLyricTimings(
  lines: string[],
  durationSeconds: number,
): LyricLine[] {
  if (!lines.length || !durationSeconds) return [];
  const durationMs = durationSeconds * 1000;
  return lines.map((text, i) => ({
    text,
    startMs: Math.round((i / lines.length) * durationMs),
    endMs: Math.round(((i + 1) / lines.length) * durationMs),
  }));
}
```

- [ ] **Step 2: Add tests for approximateLyricTimings to lib/music.test.ts**

Append to the bottom of `lib/music.test.ts`:

```ts
import { approximateLyricTimings } from "./music";

describe("approximateLyricTimings", () => {
  it("returns empty array for empty lines", () => {
    expect(approximateLyricTimings([], 180)).toEqual([]);
  });

  it("returns empty array for zero duration", () => {
    expect(approximateLyricTimings(["line1"], 0)).toEqual([]);
  });

  it("distributes 2 lines across duration", () => {
    const result = approximateLyricTimings(["A", "B"], 10);
    expect(result[0].startMs).toBe(0);
    expect(result[0].endMs).toBe(5000);
    expect(result[1].startMs).toBe(5000);
    expect(result[1].endMs).toBe(10000);
  });

  it("last line endMs equals total duration in ms", () => {
    const result = approximateLyricTimings(["A", "B", "C"], 30);
    expect(result[result.length - 1].endMs).toBe(30000);
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
npx vitest run lib/music.test.ts
```

Expected: all tests green

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add lib/music.ts lib/music.test.ts
git commit -m "feat(types): add RefundStatus, LyricLine, approximateLyricTimings"
```

---

### Task 2: Remove status badge from track cards

**Files:**
- Modify: `components/music-workspace.tsx` (line 819)

- [ ] **Step 1: Delete the StatusBadge element from TrackRow**

In `components/music-workspace.tsx`, find line 819:
```tsx
          <StatusBadge status={track.status} />
```
Delete that single line. The `<p>` tag for title remains. Do not remove the `StatusBadge` component definition (it may be used for internal tooltip labels in the future) — but per PRD requirement it must not be visible on cards.

The title block after the change:
```tsx
        <div className="flex min-w-0 items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => onRenameDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitRename();
                if (e.key === "Escape") onCancelRename();
              }}
              onBlur={onCommitRename}
              className="min-w-0 flex-1 rounded-md border border-emerald-300/40 bg-black/30 px-2 py-1 text-sm font-semibold text-white outline-none"
            />
          ) : (
            <p className="truncate text-sm font-semibold text-white/88">
              {track.title}
            </p>
          )}
        </div>
```

- [ ] **Step 2: Build + lint**

```bash
npm run build && npm run lint
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/music-workspace.tsx
git commit -m "feat(ux): remove status badge from track cards"
```

---

### Task 3: Mobile player — hide volume slider, improve seek touch target

**Files:**
- Modify: `components/workspace-music-player.tsx`

- [ ] **Step 1: Hide volume control on mobile, keep close always visible**

Replace the entire third column div (lines 169–190) in `workspace-music-player.tsx`:

**Before:**
```tsx
        <div className="flex min-w-0 items-center justify-between gap-2 text-white/50 lg:justify-end">
          <VolumeIcon className="h-4 w-4 shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            aria-label="Volume"
            className="h-1 min-w-0 flex-1 accent-white sm:max-w-32 lg:w-24 lg:flex-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            title="Close player"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Close player</span>
          </button>
        </div>
```

**After:**
```tsx
        <div className="flex min-w-0 items-center justify-end gap-2 text-white/50">
          <div className="hidden items-center gap-2 lg:flex">
            <VolumeIcon className="h-4 w-4 shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              aria-label="Volume"
              className="h-1 w-24 accent-white"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
            title="Close player"
          >
            <CloseIcon className="h-4 w-4" />
            <span className="sr-only">Close player</span>
          </button>
        </div>
```

- [ ] **Step 2: Expand seek touch target for mobile**

Replace the seek container div (lines 91–117) in `workspace-music-player.tsx`:

**Before:**
```tsx
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3 px-3 pt-2">
        <span className="text-right text-[10px] tabular-nums text-white/45">
          {formatTime(currentTime)}
        </span>
        <div className="relative h-1 bg-white/10">
          <progress
            value={progressValue}
            max={seekMax}
            aria-hidden
            className="absolute inset-0 h-1 w-full appearance-none overflow-hidden [&::-moz-progress-bar]:bg-white [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white"
          />
          <input
            type="range"
            min={0}
            max={seekMax}
            step={1}
            value={progressValue}
            disabled={!resolvedDuration}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Seek track"
            className="absolute inset-0 h-1 w-full cursor-pointer appearance-none bg-transparent opacity-0"
          />
        </div>
        <span className="text-[10px] tabular-nums text-white/45">
          {resolvedDuration ? formatTime(resolvedDuration) : "--:--"}
        </span>
      </div>
```

**After:**
```tsx
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3 px-3 pt-2">
        <span className="text-right text-[10px] tabular-nums text-white/45">
          {formatTime(currentTime)}
        </span>
        <div className="relative -my-3 py-3">
          <div className="relative h-1 bg-white/10">
            <progress
              value={progressValue}
              max={seekMax}
              aria-hidden
              className="absolute inset-0 h-1 w-full appearance-none overflow-hidden [&::-moz-progress-bar]:bg-white [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white"
            />
            <input
              type="range"
              min={0}
              max={seekMax}
              step={1}
              value={progressValue}
              disabled={!resolvedDuration}
              onChange={(event) => onSeek(Number(event.target.value))}
              aria-label="Seek track"
              className="absolute inset-x-0 -inset-y-3 h-[calc(100%+24px)] w-full cursor-pointer appearance-none bg-transparent opacity-0"
            />
          </div>
        </div>
        <span className="text-[10px] tabular-nums text-white/45">
          {resolvedDuration ? formatTime(resolvedDuration) : "--:--"}
        </span>
      </div>
```

- [ ] **Step 3: Build + lint**

```bash
npm run build && npm run lint
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/workspace-music-player.tsx
git commit -m "feat(player): hide volume slider on mobile, expand seek touch target"
```

---

### Task 4: Write refund_status to musics.metadata on prediction failure

**Files:**
- Modify: `app/api/music/[id]/route.ts` (lines 266–283)

- [ ] **Step 1: Update refundAndMarkFailed to write refund_status**

Replace the entire `refundAndMarkFailed` function (lines 266–283) in `app/api/music/[id]/route.ts`:

**Before:**
```ts
async function refundAndMarkFailed(
  userId: string,
  id: string,
  message: string,
): Promise<Music | null> {
  const admin = createInsforgeAdminClient();
  const { data, error } = await admin.database.rpc("refund_failed_music_credit", {
    p_user_id: userId,
    p_music_id: id,
    p_message: message,
  });

  if (error) {
    console.error("music failure refund failed", error);
  }

  return (data as Music | null) ?? null;
}
```

**After:**
```ts
async function refundAndMarkFailed(
  userId: string,
  id: string,
  message: string,
): Promise<Music | null> {
  const admin = createInsforgeAdminClient();
  const { data, error } = await admin.database.rpc("refund_failed_music_credit", {
    p_user_id: userId,
    p_music_id: id,
    p_message: message,
  });

  if (error) {
    console.error("music failure refund failed", error);
  }

  const music = data as Music | null;
  const refundStatus = error ? "failed" : "refunded";
  const existingMetadata = music?.metadata ?? {};

  try {
    const { data: updated } = await admin.database
      .from("musics")
      .update({ metadata: { ...existingMetadata, refund_status: refundStatus } })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (updated) return updated as Music;
  } catch (metaErr) {
    console.error("refund_status metadata update failed", metaErr);
  }

  return music ?? null;
}
```

Also add `RefundStatus` import at the top of the file (update the existing import from `@/lib/music`):

**Before:**
```ts
import { MUSICS_BUCKET, type Music } from "@/lib/music";
```

**After:**
```ts
import { MUSICS_BUCKET, type Music, type RefundStatus } from "@/lib/music";
```

Note: `RefundStatus` is imported but used only for documentation clarity. TypeScript will infer the literal correctly without the explicit cast.

- [ ] **Step 2: Build + lint**

```bash
npm run build && npm run lint
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/api/music/[id]/route.ts
git commit -m "feat(api): write refund_status to music metadata on prediction failure"
```

---

### Task 5: Create GenerationProgressModal component

**Files:**
- Create: `components/generation-progress-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import * as React from "react";

type ProgressStep = {
  percent: number;
  message: string;
};

function calcProgress(elapsedMs: number): ProgressStep {
  const s = elapsedMs / 1000;
  if (s < 10) return { percent: Math.round((s / 10) * 10), message: "Starting your song..." };
  if (s < 20) return { percent: 10 + Math.round(((s - 10) / 10) * 10), message: "Understanding your idea..." };
  if (s < 35) return { percent: 20 + Math.round(((s - 20) / 15) * 15), message: "Writing lyrics and shaping the music direction..." };
  if (s < 90) return { percent: 35 + Math.round(((s - 35) / 55) * 40), message: "Composing your track..." };
  if (s < 120) return { percent: 75 + Math.round(((s - 90) / 30) * 15), message: "Rendering audio..." };
  return { percent: Math.min(98, 90 + Math.round(((s - 120) / 60) * 8)), message: "Saving your song..." };
}

type GenerationProgressModalProps = {
  startMs: number;
  phase: "generating" | "success";
  onClose: () => void;
};

export default function GenerationProgressModal({
  startMs,
  phase,
  onClose,
}: GenerationProgressModalProps) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (phase === "success") return;
    const id = window.setInterval(() => {
      setElapsed(Date.now() - startMs);
    }, 200);
    return () => window.clearInterval(id);
  }, [startMs, phase]);

  const { percent, message } =
    phase === "success"
      ? { percent: 100, message: "Your song is ready." }
      : calcProgress(elapsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0e]/90 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white/80"
        title="Minimize"
        aria-label="Minimize progress"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M6 18 18 6M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-[0_0_40px_rgba(255,255,255,0.06)]">
          {phase === "success" ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-300" aria-hidden>
              <path
                d="m5 13 4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white/90">
            {phase === "success" ? "Song Ready" : "Creating Your Music"}
          </h2>
          <p className="mt-1.5 text-sm text-white/45">{message}</p>
        </div>

        <div className="w-full">
          <div className="relative h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-right text-[11px] tabular-nums text-white/35">
            {percent}%
          </p>
        </div>

        {phase !== "success" && (
          <p className="text-[11px] text-white/25">This may take a minute.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add components/generation-progress-modal.tsx
git commit -m "feat(ui): add GenerationProgressModal component"
```

---

### Task 6: Create FailureModal component

**Files:**
- Create: `components/failure-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import type { RefundStatus } from "@/lib/music";

type FailureModalProps = {
  refundStatus: RefundStatus;
  onTryAgain: () => void;
  onEditPrompt: () => void;
  onClose: () => void;
};

export default function FailureModal({
  refundStatus,
  onTryAgain,
  onEditPrompt,
  onClose,
}: FailureModalProps) {
  const refundMessage =
    refundStatus === "refunded"
      ? "Your credit has been returned."
      : refundStatus === "failed"
        ? "We couldn't confirm the credit refund yet. Please contact support if your credit does not return."
        : "Your credit refund is being processed.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0e]/90 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-white/8 bg-[#161820] px-8 py-8 text-center shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-400/8">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-red-300"
            aria-hidden
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-base font-semibold text-white/90">
            Music generation failed
          </h2>
          <p className="mt-1 text-sm text-white/50">
            We couldn&apos;t finish this song.
          </p>
          <p className="mt-2 text-sm text-white/70">{refundMessage}</p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onTryAgain}
            className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onEditPrompt}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.10]"
          >
            Edit prompt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-xs text-white/35 hover:text-white/60"
          >
            Back to workspace
          </button>
        </div>

        {refundStatus === "failed" && (
          <a
            href="/contact"
            className="text-xs text-white/35 underline hover:text-white/60"
          >
            Contact support
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add components/failure-modal.tsx
git commit -m "feat(ui): add FailureModal component with refund status"
```

---

### Task 7: Wire GenerationProgressModal + FailureModal into MusicWorkspace

**Files:**
- Modify: `components/music-workspace.tsx`

This task has 4 sub-steps: add state/refs, update `poll`, update `handleSend`, update render.

- [ ] **Step 1: Add imports at top of music-workspace.tsx**

After the existing imports (after `import WorkspaceMusicPlayer...`), add:

```tsx
import GenerationProgressModal from "@/components/generation-progress-modal";
import FailureModal from "@/components/failure-modal";
import type { RefundStatus } from "@/lib/music";
```

- [ ] **Step 2: Add generation state and refs inside MusicWorkspace (after line 131 `const audioRef`)**

```tsx
  const genMusicIdRef = React.useRef<string | null>(null);
  const genCallbackRef = React.useRef<(music: Music) => void>(() => {});
  const [genPhase, setGenPhase] = React.useState<
    "idle" | "generating" | "success" | "failed"
  >("idle");
  const [genStartMs, setGenStartMs] = React.useState(0);
  const [genRefundStatus, setGenRefundStatus] =
    React.useState<RefundStatus>("pending");
```

- [ ] **Step 3: Add genCallbackRef effect (after the handleSeek definition, around line 346)**

```tsx
  React.useEffect(() => {
    genCallbackRef.current = (music: Music) => {
      if (music.id !== genMusicIdRef.current) return;
      if (music.status === "completed") {
        genMusicIdRef.current = null;
        setGenPhase("success");
        window.setTimeout(() => {
          setGenPhase("idle");
          void loadAndPlayTrack(music);
        }, 1200);
      } else if (music.status === "failed") {
        genMusicIdRef.current = null;
        const refundStatus =
          (music.metadata?.refund_status as RefundStatus | undefined) ??
          "pending";
        setGenRefundStatus(refundStatus);
        setGenPhase("failed");
      }
    };
  }, [loadAndPlayTrack]);
```

- [ ] **Step 4: Update poll to call genCallbackRef (replace the poll useCallback)**

Replace the `poll` useCallback (lines 214–242):

**Before:**
```tsx
  const poll = React.useCallback(
    (id: string) => {
      if (polling.current.has(id)) return;
      polling.current.add(id);

      const tick = async () => {
        try {
          const res = await fetch(`/api/music/${id}`);
          const json = (await res.json()) as { music?: Music };
          if (json.music) {
            upsertTrack(json.music);
            if (
              json.music.status === "completed" ||
              json.music.status === "failed"
            ) {
              polling.current.delete(id);
              return;
            }
          }
        } catch {
          // Keep polling through temporary network failures.
        }
        window.setTimeout(tick, POLL_INTERVAL);
      };

      window.setTimeout(tick, POLL_INTERVAL);
    },
    [upsertTrack],
  );
```

**After:**
```tsx
  const poll = React.useCallback(
    (id: string) => {
      if (polling.current.has(id)) return;
      polling.current.add(id);

      const tick = async () => {
        try {
          const res = await fetch(`/api/music/${id}`);
          const json = (await res.json()) as { music?: Music };
          if (json.music) {
            upsertTrack(json.music);
            genCallbackRef.current(json.music);
            if (
              json.music.status === "completed" ||
              json.music.status === "failed"
            ) {
              polling.current.delete(id);
              return;
            }
          }
        } catch {
          // Keep polling through temporary network failures.
        }
        window.setTimeout(tick, POLL_INTERVAL);
      };

      window.setTimeout(tick, POLL_INTERVAL);
    },
    [upsertTrack],
  );
```

- [ ] **Step 5: Update handleSend to set gen state**

In `handleSend` (starting around line 388), make these changes:

After `upsertTrack(optimisticTrack);` (line 393), add:
```tsx
      setGenPhase("generating");
      setGenStartMs(Date.now());
```

In the error branches inside the try block (where `removeTrack(optimisticTrack.id)` is called), add `setGenPhase("idle");` before each `removeTrack` call:

```tsx
        if (!res.ok || !json.music) {
          const reason = json.error || `HTTP ${res.status}` || "unknown";
          console.error("generate failed:", res.status, raw);
          if (typeof json.remaining_credit === "number") {
            onRemainingCreditChange?.(json.remaining_credit);
          }
          setGenPhase("idle");   // NEW
          removeTrack(optimisticTrack.id);
          if (reason === "insufficient_credit") {
            setError(INSUFFICIENT_CREDIT_MESSAGE);
            onOpenCreditModal?.();
            return;
          }
          if (reason === "lyrics_generation_failed") {
            setError(LYRICS_GENERATION_FAILED_MESSAGE);
            return;
          }
          setError(reason);
          return;
        }
```

After `replaceTrack(optimisticTrack.id, json.music);` (line 435), add:
```tsx
        genMusicIdRef.current = json.music.id;
```

In the catch block, add `setGenPhase("idle");` before `removeTrack`:
```tsx
    } catch (err) {
      console.error("generate request failed", err);
      setGenPhase("idle");    // NEW
      removeTrack(optimisticTrack.id);
      setError("Request failed. Check your network and try again.");
    }
```

- [ ] **Step 6: Add modal renders to JSX**

At the bottom of the `return (...)` in `MusicWorkspace`, just before the closing `</div>` of the root element (after the `<audio>` tag), add:

```tsx
      {(genPhase === "generating" || genPhase === "success") && (
        <GenerationProgressModal
          startMs={genStartMs}
          phase={genPhase}
          onClose={() => setGenPhase("idle")}
        />
      )}

      {genPhase === "failed" && (
        <FailureModal
          refundStatus={genRefundStatus}
          onTryAgain={() => setGenPhase("idle")}
          onEditPrompt={() => setGenPhase("idle")}
          onClose={() => setGenPhase("idle")}
        />
      )}
```

- [ ] **Step 7: Build + lint**

```bash
npm run build && npm run lint
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add components/music-workspace.tsx
git commit -m "feat(ux): wire generation progress and failure modals into workspace"
```

---

## P1 Phase — Ship Next

### Task 8: Create FullscreenPlayer component with lyrics view

**Files:**
- Create: `components/fullscreen-player.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import * as React from "react";
import MusicThumbnail from "@/components/music-thumbnail";
import { approximateLyricTimings, type Music, type LyricLine } from "@/lib/music";

type FullscreenPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onClose: () => void;
};

function parseLyricLines(track: Music): LyricLine[] | null {
  const raw = track.metadata?.lyrics as string | undefined;
  if (!raw || raw.trim() === "[Instrumental]" || !raw.trim()) return null;
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\[.*\]$/.test(l));
  if (!lines.length) return null;
  return approximateLyricTimings(lines, track.duration_seconds ?? 0);
}

function findActiveIndex(lines: LyricLine[], currentTimeMs: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTimeMs >= lines[i].startMs) return i;
  }
  return 0;
}

export default function FullscreenPlayer({
  track,
  playing,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  onClose,
}: FullscreenPlayerProps) {
  const resolvedDuration = duration || track.duration_seconds || 0;
  const lyricLines = React.useMemo(() => parseLyricLines(track), [track]);
  const currentTimeMs = currentTime * 1000;
  const activeIdx = lyricLines ? findActiveIndex(lyricLines, currentTimeMs) : -1;
  const activeLyricRef = React.useRef<HTMLParagraphElement>(null);
  const [userScrolling, setUserScrolling] = React.useState(false);
  const userScrollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!activeLyricRef.current || userScrolling) return;
    activeLyricRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx, userScrolling]);

  const handleLyricsScroll = React.useCallback(() => {
    setUserScrolling(true);
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    userScrollTimerRef.current = window.setTimeout(
      () => setUserScrolling(false),
      3000,
    );
  }, []);

  const progressValue = resolvedDuration
    ? Math.min(currentTime, resolvedDuration)
    : 0;
  const seekMax = resolvedDuration || 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden">
      {track.thumbnail_url ? (
        <img
          src={track.thumbnail_url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.25]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-indigo-950/80 to-sky-950/80" />
      )}
      <div className="absolute inset-0 bg-[#0a0b0e]/65" />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:text-white"
            aria-label="Close full player"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path
                d="M6 18 18 6M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
            Now Playing
          </p>
          <div className="h-9 w-9" aria-hidden />
        </div>

        <div className="flex flex-col items-center gap-3 px-8 py-4">
          <MusicThumbnail
            track={track}
            className="h-36 w-36 rounded-xl shadow-2xl sm:h-44 sm:w-44"
            showTitle={false}
          />
          <div className="text-center">
            <p className="text-lg font-bold text-white/95">{track.title}</p>
            <p className="mt-0.5 text-xs text-white/40">AI Generated</p>
          </div>
        </div>

        <div
          className="custom-scrollbar flex-1 overflow-y-auto px-6 pb-2"
          onScroll={handleLyricsScroll}
        >
          {lyricLines ? (
            <div className="space-y-3 py-6">
              {lyricLines.map((line, i) => (
                <p
                  key={i}
                  ref={i === activeIdx ? activeLyricRef : undefined}
                  className={`text-center text-base leading-relaxed transition-all duration-300 ${
                    i === activeIdx
                      ? "font-semibold text-white/95"
                      : Math.abs(i - activeIdx) <= 2
                        ? "text-white/40"
                        : "text-white/20"
                  }`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-24 items-center justify-center">
              <p className="text-sm text-white/30">
                {(track.metadata?.instrumental as boolean | undefined) === true
                  ? "Instrumental track"
                  : "No lyrics available for this track."}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-safe-bottom pb-6 pt-2">
          <div className="relative -my-3 py-3">
            <div className="relative h-1 bg-white/15">
              <progress
                value={progressValue}
                max={seekMax}
                aria-hidden
                className="absolute inset-0 h-1 w-full appearance-none overflow-hidden [&::-moz-progress-bar]:bg-white [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:bg-white"
              />
              <input
                type="range"
                min={0}
                max={seekMax}
                step={1}
                value={progressValue}
                disabled={!resolvedDuration}
                onChange={(e) => onSeek(Number(e.target.value))}
                aria-label="Seek track"
                className="absolute inset-x-0 -inset-y-3 h-[calc(100%+24px)] w-full cursor-pointer appearance-none bg-transparent opacity-0"
              />
            </div>
          </div>
          <div className="flex justify-between text-[10px] tabular-nums text-white/35">
            <span>{formatTime(currentTime)}</span>
            <span>{resolvedDuration ? formatTime(resolvedDuration) : "--:--"}</span>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black hover:bg-white/90"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
                  <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 pl-0.5" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add components/fullscreen-player.tsx
git commit -m "feat(ui): add FullscreenPlayer with active lyric highlight"
```

---

### Task 9: Wire FullscreenPlayer into WorkspaceMusicPlayer + MusicWorkspace

**Files:**
- Modify: `components/workspace-music-player.tsx`
- Modify: `components/music-workspace.tsx`

- [ ] **Step 1: Add onOpenFullscreen prop to WorkspaceMusicPlayer**

In `workspace-music-player.tsx`, update the props type:

**Before:**
```tsx
type WorkspaceMusicPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
};
```

**After:**
```tsx
type WorkspaceMusicPlayerProps = {
  track: Music;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
  onOpenFullscreen?: () => void;
};
```

Update the function signature to destructure `onOpenFullscreen`:

**Before:**
```tsx
export default function WorkspaceMusicPlayer({
  track,
  playing,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onClose,
}: WorkspaceMusicPlayerProps) {
```

**After:**
```tsx
export default function WorkspaceMusicPlayer({
  track,
  playing,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onClose,
  onOpenFullscreen,
}: WorkspaceMusicPlayerProps) {
```

- [ ] **Step 2: Make album art clickable in WorkspaceMusicPlayer**

In `workspace-music-player.tsx`, replace the `MusicThumbnail` element in the info section (inside the `flex min-w-0 items-center gap-3` div):

**Before:**
```tsx
          <MusicThumbnail
            track={track}
            className="h-11 w-11 sm:h-12 sm:w-12"
            showTitle={Boolean(track.thumbnail_url)}
          />
```

**After:**
```tsx
          <button
            type="button"
            onClick={onOpenFullscreen}
            disabled={!onOpenFullscreen}
            className="shrink-0 disabled:cursor-default"
            aria-label="Open full player"
          >
            <MusicThumbnail
              track={track}
              className="h-11 w-11 sm:h-12 sm:w-12"
              showTitle={Boolean(track.thumbnail_url)}
            />
          </button>
```

- [ ] **Step 3: Add fullscreenOpen state and FullscreenPlayer import to MusicWorkspace**

In `music-workspace.tsx`, add import after the other component imports:

```tsx
import FullscreenPlayer from "@/components/fullscreen-player";
```

After the `genRefundStatus` state (added in Task 7), add:

```tsx
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);
```

- [ ] **Step 4: Pass onOpenFullscreen to WorkspaceMusicPlayer**

In `music-workspace.tsx`, find the `<WorkspaceMusicPlayer ... />` render (around line 658). Add the prop:

```tsx
          <WorkspaceMusicPlayer
            track={activeTrack}
            playing={playing}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            onTogglePlay={handleTogglePlayerPlayback}
            onSeek={handleSeek}
            onVolumeChange={setVolume}
            onClose={handleClosePlayer}
            onOpenFullscreen={() => setFullscreenOpen(true)}
          />
```

- [ ] **Step 5: Render FullscreenPlayer when open**

After the `FailureModal` render (added in Task 7), add:

```tsx
      {fullscreenOpen && activeTrack && (
        <FullscreenPlayer
          track={activeTrack}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={handleTogglePlayerPlayback}
          onSeek={handleSeek}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
```

Also close fullscreen when the player is closed. In `handleClosePlayer`, add `setFullscreenOpen(false)`:

**Before:**
```tsx
  const handleClosePlayer = React.useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    setActiveTrackId(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);
```

**After:**
```tsx
  const handleClosePlayer = React.useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    setActiveTrackId(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setFullscreenOpen(false);
  }, []);
```

- [ ] **Step 6: Build + lint**

```bash
npm run build && npm run lint
```

Expected: PASS

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass (vitest run)

- [ ] **Step 8: Commit**

```bash
git add components/workspace-music-player.tsx components/music-workspace.tsx
git commit -m "feat(player): wire full-screen lyrics player, album cover tap to open"
```

---

## Self-Review: Spec Coverage

| PRD Requirement | Covered by Task |
|---|---|
| Mobile volume slider hidden by default | Task 3 |
| Seek/progress bar primary control | Task 3 (touch target expanded) |
| Ready badge removal | Task 2 |
| Generation progress screen (0–98%) | Task 5, wired in Task 7 |
| Progress step messages | Task 5 (`calcProgress`) |
| 100% only on actual success | Task 7 (phase="success" → 100%) |
| Failure screen | Task 6 |
| Credit refund status in failure screen | Task 4 + Task 6 |
| Failure: Try again / Edit prompt / Back | Task 6 |
| Raw error not shown to user | Task 6 (human-readable only) |
| Album cover click → full-screen player | Task 9 |
| Full-screen blurred album bg | Task 8 |
| Lyrics display with glass panel | Task 8 (dark overlay + translucent area) |
| Active lyric line highlight | Task 8 (`findActiveIndex`) |
| Auto-scroll active lyric | Task 8 (`scrollIntoView`) |
| User scroll pauses auto-scroll | Task 8 (`userScrolling` state) |
| Approximate lyric timing fallback | Task 1 (`approximateLyricTimings`) |
| Lyrics unavailable fallback | Task 8 (null check + fallback text) |
| Instrumental track fallback | Task 8 (`metadata.instrumental` check) |
| Desktop layout not regressed | Task 3 (`hidden lg:flex` keeps desktop volume) |
| Internal status/refund logic retained | Tasks untouched polling, RPC, reconcile |

**Remaining TODOs / Assumptions:**
- `reconcile-music.ts` does NOT write `refund_status` to metadata (only the polling route does). Reconciled failures show `refund_status: 'pending'` in the failure modal for now.
- Lyric timing is approximate (equal distribution). True karaoke sync would require model-level timestamp support.
- `parseLyricLines` filters `[Verse]`/`[Chorus]` section tags. If lyrics are plain-text without section tags, all lines show correctly.
- `handleClosePlayer` dep array will need `setFullscreenOpen` — React stable setter, no extra dep needed.
- The PRD's P2 items (line tap-to-seek, visualizer, shareable player) are intentionally omitted from this plan.
