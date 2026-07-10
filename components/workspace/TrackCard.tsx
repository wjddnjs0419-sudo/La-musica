"use client";

import * as React from "react";
import MusicThumbnail from "@/components/music-thumbnail";
import type { Music } from "@/lib/music";
import { formatDuration } from "@/lib/player/time";

export const OPTIMISTIC_TRACK_PREFIX = "optimistic-";

function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
  </svg>
);

const MoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
    {...props}
  >
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);


function statusTooltip(status: Music["status"]): string {
  const labels: Record<Music["status"], string> = {
    pending: "Starting...",
    processing: "Composing your track...",
    completed: "Ready",
    failed: "Failed",
  };
  return labels[status];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}


export type TrackCardProps = {
  track: Music;
  busy: boolean;
  menuOpen: boolean;
  active: boolean;
  playing: boolean;
  renaming: boolean;
  renameDraft: string;
  confirmingDelete: boolean;
  onTogglePlayback: () => void;
  onToggleMenu: () => void;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export default function TrackCard({
  track,
  busy,
  menuOpen,
  active,
  playing,
  renaming,
  renameDraft,
  confirmingDelete,
  onTogglePlayback,
  onToggleMenu,
  onRenameDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: TrackCardProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      onToggleMenu();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen, onToggleMenu]);
  const pending = track.status === "pending" || track.status === "processing";
  const optimistic = track.id.startsWith(OPTIMISTIC_TRACK_PREFIX);
  const playable = track.status === "completed" && Boolean(track.audio_url);
  const showMetadata = !pending;

  return (
    <div
      className={cn(
        "group relative grid min-h-20 grid-cols-[38px_42px_minmax(0,1fr)_32px] items-center gap-2 rounded-lg border border-white/7 bg-[#171a20]/92 px-3 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.2)] transition sm:grid-cols-[42px_44px_minmax(0,1fr)_36px] sm:gap-3 sm:px-4",
        active && "border-emerald-300/35 bg-[#18201f]/95",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={!playable}
        title={
          playable ? (playing ? "Pause" : "Play") : statusTooltip(track.status)
        }
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[0.06] text-white/70 transition",
          playable && "hover:bg-white/[0.12] hover:text-white",
          active && "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
          pending && "text-amber-300",
        )}
      >
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
        ) : playing ? (
          <PauseIcon className="h-4 w-4" />
        ) : (
          <PlayIcon className="h-4 w-4" />
        )}
      </button>

      <MusicThumbnail track={track} className="h-10 w-10 sm:h-11 sm:w-11" />

      <div className="min-w-0">
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
        {showMetadata && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/35">
            {track.status === "failed" ? (
              <span className="text-red-400/70">
                Generation failed — credit returned.
              </span>
            ) : (
              <>
                <span>{formatDuration(track.duration_seconds)}</span>
                <span>{formatDate(track.created_at)}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          ref={triggerRef}
          type="button"
          onClick={onToggleMenu}
          disabled={optimistic}
          title="Track actions"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/45"
          aria-expanded={menuOpen}
        >
          <MoreIcon className="h-4 w-4" />
          <span className="sr-only">Open track actions</span>
        </button>
      </div>

      {menuOpen && (
        <div ref={menuRef} className="absolute right-3 top-14 z-20 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#22252c] p-1 shadow-2xl sm:right-4">
          <button
            type="button"
            onClick={onStartRename}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
          >
            Rename
          </button>
          {track.audio_url ? (
            <a
              href={`/api/music/${track.id}/download`}
              onClick={onToggleMenu}
              className="block rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
            >
              Download
            </a>
          ) : (
            <span className="block cursor-not-allowed rounded-md px-3 py-2 text-sm text-white/30">
              Download
            </span>
          )}
          {confirmingDelete ? (
            <div className="flex items-center gap-1 px-1 py-1">
              <button
                type="button"
                onClick={onConfirmDelete}
                className="flex-1 rounded-md bg-red-500/15 px-2 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/25"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="flex-1 rounded-md px-2 py-2 text-xs text-white/60 hover:bg-white/[0.08]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onRequestDelete}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
