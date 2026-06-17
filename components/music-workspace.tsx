"use client";

import * as React from "react";
import MusicThumbnail from "@/components/music-thumbnail";
import { PromptBox } from "@/components/prompt-box";
import WorkspaceMusicPlayer from "@/components/workspace-music-player";
import { resolveRenameTitle, type GenerateRequest, type Music } from "@/lib/music";

const POLL_INTERVAL = 3000;
const PAGE_SIZE = 7;

type ClassValue = string | number | boolean | null | undefined;

function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

type MusicWorkspaceProps = {
  initialTracks?: Music[];
  remainingCredit?: number;
  onRemainingCreditChange?: (credit: number) => void;
  onOpenCreditModal?: () => void;
};

const INSUFFICIENT_CREDIT_MESSAGE = "Not enough credits. Please upgrade.";

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

export default function MusicWorkspace({
  initialTracks = [],
  remainingCredit = 0,
  onRemainingCreditChange,
  onOpenCreditModal,
}: MusicWorkspaceProps) {
  const [tracks, setTracks] = React.useState<Music[]>(initialTracks);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [activeTrackId, setActiveTrackId] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.85);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const polling = React.useRef<Set<string>>(new Set());
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const activeTrack = React.useMemo(
    () => tracks.find((track) => track.id === activeTrackId) ?? null,
    [activeTrackId, tracks],
  );

  const upsertTrack = React.useCallback((music: Music) => {
    setTracks((prev) => {
      const idx = prev.findIndex((track) => track.id === music.id);
      if (idx === -1) return [music, ...prev];
      const next = [...prev];
      next[idx] = music;
      return next;
    });
  }, []);

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

  React.useEffect(() => {
    tracks.forEach((track) => {
      if (track.status === "pending" || track.status === "processing") {
        poll(track.id);
      }
    });
  }, [poll, tracks]);

  React.useEffect(() => {
    const handleSearch = (event: Event) => {
      const nextQuery =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : "";
      setQuery(nextQuery);
    };

    window.addEventListener("workspace-search", handleSearch);
    return () => window.removeEventListener("workspace-search", handleSearch);
  }, []);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const playAudio = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const loadAndPlayTrack = React.useCallback(
    async (track: Music) => {
      const audio = audioRef.current;
      if (!audio || !track.audio_url) return;

      audio.pause();
      audio.src = track.audio_url;
      audio.currentTime = 0;
      audio.volume = volume;
      audio.load();

      setActiveTrackId(track.id);
      setCurrentTime(0);
      setDuration(track.duration_seconds ?? 0);
      await playAudio();
    },
    [playAudio, volume],
  );

  const handleToggleTrackPlayback = React.useCallback(
    async (track: Music) => {
      if (track.status !== "completed" || !track.audio_url) return;

      const audio = audioRef.current;
      if (!audio) return;

      if (activeTrackId === track.id) {
        if (playing) {
          audio.pause();
          setPlaying(false);
          return;
        }
        await playAudio();
        return;
      }

      await loadAndPlayTrack(track);
    },
    [activeTrackId, loadAndPlayTrack, playAudio, playing],
  );

  const handleTogglePlayerPlayback = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack?.audio_url) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    if (!audio.src) {
      audio.src = activeTrack.audio_url;
      audio.load();
    }
    await playAudio();
  }, [activeTrack, playAudio, playing]);

  const handleSeek = React.useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const persistTrackDuration = React.useCallback(
    async (trackId: string, seconds: number) => {
      const roundedSeconds = Math.round(seconds);
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId
            ? { ...track, duration_seconds: roundedSeconds }
            : track,
        ),
      );

      try {
        const res = await fetch(`/api/music/${trackId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration_seconds: roundedSeconds }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          music?: Music;
        };
        if (res.ok && json.music) {
          upsertTrack(json.music);
        }
      } catch (err) {
        console.error("duration persist failed", err);
      }
    },
    [upsertTrack],
  );

  const handleClosePlayer = React.useCallback(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
    setActiveTrackId(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const handleSend = React.useCallback(
    async (payload: GenerateRequest) => {
      try {
        const res = await fetch("/api/music/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = await res.text();
        let json: {
          music?: Music;
          error?: string;
          remaining_credit?: number;
        } = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          json = {};
        }
        if (!res.ok || !json.music) {
          const reason = json.error || `HTTP ${res.status}` || "unknown";
          console.error("generate failed:", res.status, raw);
          if (typeof json.remaining_credit === "number") {
            onRemainingCreditChange?.(json.remaining_credit);
          }
          if (reason === "insufficient_credit") {
            setError(INSUFFICIENT_CREDIT_MESSAGE);
            onOpenCreditModal?.();
            return;
          }
          setError(reason);
          return;
        }
        if (typeof json.remaining_credit === "number") {
          onRemainingCreditChange?.(json.remaining_credit);
        }
        setError(null);
        upsertTrack(json.music);
        poll(json.music.id);
      } catch (err) {
        console.error("generate request failed", err);
        setError("Request failed. Check your network and try again.");
      }
    },
    [onOpenCreditModal, onRemainingCreditChange, poll, upsertTrack],
  );

  // Open the inline title editor (window.prompt is unsupported in this runtime).
  const handleStartRename = React.useCallback((track: Music) => {
    setOpenMenuId(null);
    setRenamingId(track.id);
    setRenameDraft(track.title);
  }, []);

  const handleCancelRename = React.useCallback(() => {
    setRenamingId(null);
    setRenameDraft("");
  }, []);

  const handleCommitRename = React.useCallback(
    async (track: Music) => {
      const nextTitle = resolveRenameTitle(renameDraft, track.title);
      setRenamingId(null);
      setRenameDraft("");
      if (!nextTitle) return;

      setBusyId(track.id);
      try {
        const res = await fetch(`/api/music/${track.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        });
        const json = (await res.json()) as { music?: Music; error?: string };
        if (!res.ok || !json.music) {
          setError(json.error || `Rename failed (${res.status})`);
          return;
        }
        setError(null);
        upsertTrack(json.music);
      } catch (err) {
        console.error("rename failed", err);
        setError("Rename failed. Check your network and try again.");
      } finally {
        setBusyId(null);
      }
    },
    [renameDraft, upsertTrack],
  );

  const handleDelete = React.useCallback(
    async (track: Music) => {
      setOpenMenuId(null);
      setConfirmDeleteId(null);

      setBusyId(track.id);
      try {
        const res = await fetch(`/api/music/${track.id}`, { method: "DELETE" });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(json.error || `Delete failed (${res.status})`);
          return;
        }
        setError(null);
        if (activeTrackId === track.id) {
          handleClosePlayer();
        }
        setTracks((prev) => prev.filter((item) => item.id !== track.id));
      } catch (err) {
        console.error("delete failed", err);
        setError("Delete failed. Check your network and try again.");
      } finally {
        setBusyId(null);
      }
    },
    [activeTrackId, handleClosePlayer],
  );

  const filteredTracks = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((track) =>
      [track.title, track.prompt, track.status]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [query, tracks]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTracks.length / PAGE_SIZE),
  );

  // Reset to the first page whenever the search query changes (render-time
  // adjustment per React's "storing info from previous renders" pattern).
  const [prevQuery, setPrevQuery] = React.useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(0);
  }

  // Clamp the page during render so a shrinking list never leaves us stranded
  // on an out-of-range page.
  const safePage = Math.min(page, totalPages - 1);

  const pagedTracks = React.useMemo(
    () =>
      filteredTracks.slice(
        safePage * PAGE_SIZE,
        safePage * PAGE_SIZE + PAGE_SIZE,
      ),
    [filteredTracks, safePage],
  );

  const goToPage = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), totalPages - 1);
      setPage(clamped);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [totalPages],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-4 sm:px-4 md:py-8">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-white/40">
              <p className="text-sm">Create a song and it will appear here.</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-white/40">
              <p className="text-sm">No tracks match your search.</p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
              {pagedTracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  busy={busyId === track.id}
                  menuOpen={openMenuId === track.id}
                  active={activeTrackId === track.id}
                  playing={activeTrackId === track.id && playing}
                  onTogglePlayback={() => handleToggleTrackPlayback(track)}
                  onToggleMenu={() => {
                    setConfirmDeleteId(null);
                    setOpenMenuId((id) => (id === track.id ? null : track.id));
                  }}
                  renaming={renamingId === track.id}
                  renameDraft={renameDraft}
                  onRenameDraftChange={setRenameDraft}
                  onStartRename={() => handleStartRename(track)}
                  onCommitRename={() => handleCommitRename(track)}
                  onCancelRename={handleCancelRename}
                  confirmingDelete={confirmDeleteId === track.id}
                  onRequestDelete={() => setConfirmDeleteId(track.id)}
                  onConfirmDelete={() => handleDelete(track)}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                />
              ))}

              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage === 0}
                    title="Previous page"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[0.06] transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </button>
                  <span className="min-w-16 text-center text-xs font-medium text-white/55">
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage >= totalPages - 1}
                    title="Next page"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/8 bg-white/[0.06] transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full shrink-0 px-3 pb-4 sm:px-4 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          {error && (
            <p className="mb-2 px-2 text-xs text-red-400/80">Error: {error}</p>
          )}
          <PromptBox
            onSend={handleSend}
            remainingCredits={remainingCredit}
          />
        </div>
        {activeTrack && activeTrack.audio_url && (
          <div className="w-full">
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
            />
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          if (Number.isFinite(nextDuration)) {
            setDuration(nextDuration);
            if (
              activeTrackId &&
              Math.round(nextDuration) !== activeTrack?.duration_seconds
            ) {
              void persistTrackDuration(activeTrackId, nextDuration);
            }
          }
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}

function TrackRow({
  track,
  busy,
  menuOpen,
  active,
  playing,
  onTogglePlayback,
  onToggleMenu,
  renaming,
  renameDraft,
  onRenameDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  confirmingDelete,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  track: Music;
  busy: boolean;
  menuOpen: boolean;
  active: boolean;
  playing: boolean;
  onTogglePlayback: () => void;
  onToggleMenu: () => void;
  renaming: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  confirmingDelete: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const pending = track.status === "pending" || track.status === "processing";
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
          playable ? (playing ? "Pause" : "Play") : statusLabel(track.status)
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
          <StatusBadge status={track.status} />
        </div>
        {showMetadata && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/35">
            <span>{formatDuration(track.duration_seconds)}</span>
            <span>{formatDate(track.created_at)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onToggleMenu}
          title="Track actions"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.08] hover:text-white"
          aria-expanded={menuOpen}
        >
          <MoreIcon className="h-4 w-4" />
          <span className="sr-only">Open track actions</span>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-3 top-14 z-20 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#22252c] p-1 shadow-2xl sm:right-4">
          <button
            type="button"
            onClick={onStartRename}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08] hover:text-white"
          >
            Rename
          </button>
          {track.audio_url ? (
            <a
              href={track.audio_url}
              download={`${safeFileName(track.title)}.mp3`}
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

function StatusBadge({ status }: { status: Music["status"] }) {
  const styles: Record<Music["status"], string> = {
    pending: "bg-white/10 text-white/60",
    processing: "bg-amber-400/15 text-amber-300",
    completed: "bg-emerald-400/15 text-emerald-300",
    failed: "bg-red-400/15 text-red-300",
  };
  const labels: Record<Music["status"], string> = {
    pending: "Pending",
    processing: "Generating",
    completed: "Ready",
    failed: "Failed",
  };
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function statusLabel(status: Music["status"]) {
  const labels: Record<Music["status"], string> = {
    pending: "Pending",
    processing: "Generating",
    completed: "Ready",
    failed: "Failed",
  };
  return labels[status];
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

function safeFileName(title: string) {
  return title.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "track";
}
