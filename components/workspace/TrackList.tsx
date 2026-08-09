"use client";

import * as React from "react";
import TrackCard from "@/components/workspace/TrackCard";
import type { Music } from "@/lib/music";

const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

const ChevronRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export function TrackListSkeleton() {
  return (
    <div
      aria-label="Loading tracks"
      className="mx-auto flex w-full flex-col"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid min-h-[82px] animate-pulse grid-cols-[36px_48px_minmax(0,1fr)_32px] items-center gap-3 border-b border-white/10 px-1 py-3 sm:grid-cols-[40px_56px_minmax(0,1fr)_100px_68px_32px] sm:gap-4 sm:px-2"
        >
          <div className="h-9 w-9 rounded-lg bg-white/[0.08]" />
          <div className="h-12 w-12 bg-white/[0.08] sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <div className="h-3.5 w-2/3 rounded bg-white/[0.1]" />
            <div className="mt-2 h-2.5 w-32 rounded bg-white/[0.06]" />
          </div>
          <div className="hidden h-3 w-16 rounded bg-white/[0.06] sm:block" />
          <div className="hidden h-3 w-10 rounded bg-white/[0.06] sm:block" />
          <div className="h-8 w-8 rounded-lg bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export type TrackListProps = {
  tracks: Music[];
  busyId: string | null;
  openMenuId: string | null;
  activeTrackId: string | null;
  playingId: string | null;
  renamingId: string | null;
  renameDraft: string;
  confirmDeleteId: string | null;
  page: number;
  totalPages: number;
  onGoToPage: (next: number) => void;
  onTogglePlayback: (track: Music) => void;
  onToggleMenu: (trackId: string) => void;
  onRenameDraftChange: (value: string) => void;
  onStartRename: (track: Music) => void;
  onCommitRename: (track: Music) => void;
  onCancelRename: () => void;
  onRequestDelete: (trackId: string) => void;
  onConfirmDelete: (track: Music) => void;
  onCancelDelete: () => void;
};

export default function TrackList({
  tracks,
  busyId,
  openMenuId,
  activeTrackId,
  playingId,
  renamingId,
  renameDraft,
  confirmDeleteId,
  page,
  totalPages,
  onGoToPage,
  onTogglePlayback,
  onToggleMenu,
  onRenameDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: TrackListProps) {
  return (
    <div className="mx-auto flex w-full flex-col border-t border-white/10">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          busy={busyId === track.id}
          menuOpen={openMenuId === track.id}
          active={activeTrackId === track.id}
          playing={playingId === track.id}
          renaming={renamingId === track.id}
          renameDraft={renameDraft}
          confirmingDelete={confirmDeleteId === track.id}
          onTogglePlayback={() => onTogglePlayback(track)}
          onToggleMenu={() => onToggleMenu(track.id)}
          onRenameDraftChange={onRenameDraftChange}
          onStartRename={() => onStartRename(track)}
          onCommitRename={() => onCommitRename(track)}
          onCancelRename={onCancelRename}
          onRequestDelete={() => onRequestDelete(track.id)}
          onConfirmDelete={() => onConfirmDelete(track)}
          onCancelDelete={onCancelDelete}
        />
      ))}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => onGoToPage(page - 1)}
            disabled={page === 0}
            title="Previous page"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[0.06] transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </button>
          <span className="min-w-16 text-center text-xs font-medium text-white/55">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onGoToPage(page + 1)}
            disabled={page >= totalPages - 1}
            title="Next page"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[0.06] transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRightIcon className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </button>
        </div>
      )}
    </div>
  );
}
