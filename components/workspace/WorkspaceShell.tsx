"use client";

import * as React from "react";
import TrackList, { TrackListSkeleton } from "@/components/workspace/TrackList";
import MusicComposer from "@/components/workspace/MusicComposer";
import CreateSongModal from "@/components/workspace/CreateSongModal";
import MiniPlayer from "@/components/player/MiniPlayer";
import FullScreenPlayer from "@/components/player/FullScreenPlayer";
import {
  resolveRenameTitle,
  type GenerateRequest,
  type Music,
} from "@/lib/music";
import type { GenerationPhase, RefundStatus } from "@/lib/generation/progress";

const POLL_INTERVAL = 3000;
const PAGE_SIZE = 7;
const OPTIMISTIC_TRACK_PREFIX = "optimistic-";

const INSUFFICIENT_CREDIT_MESSAGE = "Not enough credits. Please upgrade.";
const LYRICS_GENERATION_FAILED_MESSAGE =
  "Couldn't generate lyrics automatically. Please add lyrics manually and try again.";

type WorkspaceShellProps = {
  initialTracks?: Music[];
  remainingCredit?: number;
  onUserChange?: (user: WorkspaceUser | null) => void;
  onRemainingCreditChange?: (credit: number) => void;
  onOpenCreditModal?: () => void;
  loadInitialData?: boolean;
};

type WorkspaceUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export default function WorkspaceShell({
  initialTracks = [],
  remainingCredit = 0,
  onUserChange,
  onRemainingCreditChange,
  onOpenCreditModal,
  loadInitialData = false,
}: WorkspaceShellProps) {
  const [tracks, setTracks] = React.useState<Music[]>(initialTracks);
  const [initialLoading, setInitialLoading] = React.useState(
    () => loadInitialData,
  );
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(
    null,
  );
  const [activeTrackId, setActiveTrackId] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.85);

  const [genPhase, setGenPhase] = React.useState<GenerationPhase>("idle");
  const [genStartMs, setGenStartMs] = React.useState(0);
  const [genRefundStatus, setGenRefundStatus] =
    React.useState<RefundStatus>("pending");
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [readyMusic, setReadyMusic] = React.useState<Music | null>(null);

  const audioRef = React.useRef<HTMLAudioElement>(null);
  const polling = React.useRef<Map<string, number>>(new Map());
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const genMusicIdRef = React.useRef<string | null>(null);
  const genCallbackRef = React.useRef<(music: Music) => void>(() => {});

  React.useEffect(() => {
    if (!loadInitialData) return;
    let cancelled = false;

    async function loadWorkspaceData() {
      setInitialLoading(true);
      try {
        const response = await fetch("/api/workspace/bootstrap", {
          cache: "no-store",
        });
        const json = (await response.json().catch(() => ({}))) as {
          user?: WorkspaceUser | null;
          tracks?: Music[];
          credit?: number;
          error?: string;
        };
        if (cancelled) return;
        if (response.status === 401) {
          window.location.assign("/?auth=1&returnTo=%2Fworkspace");
          return;
        }
        if (!response.ok) {
          setError(json.error ?? `Workspace load failed (${response.status})`);
          return;
        }
        onUserChange?.(json.user ?? null);
        const serverTracks = Array.isArray(json.tracks) ? json.tracks : [];
        setTracks((prev) => [
          ...prev.filter((t) => t.id.startsWith(OPTIMISTIC_TRACK_PREFIX)),
          ...serverTracks,
        ]);
        if (typeof json.credit === "number") {
          onRemainingCreditChange?.(json.credit);
        }
        setError(null);
        if (new URLSearchParams(window.location.search).get("create") === "1") {
          setCreateModalOpen(true);
          window.history.replaceState({}, "", "/workspace");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("workspace bootstrap failed", err);
          setError("Workspace could not be loaded. Please refresh.");
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    void loadWorkspaceData();
    return () => {
      cancelled = true;
    };
  }, [loadInitialData, onRemainingCreditChange, onUserChange]);

  const activeTrack = React.useMemo(
    () => tracks.find((t) => t.id === activeTrackId) ?? null,
    [activeTrackId, tracks],
  );

  const completedTracks = React.useMemo(
    () =>
      tracks.filter((t) => t.status === "completed" && Boolean(t.audio_url)),
    [tracks],
  );

  const activeCompletedIndex = completedTracks.findIndex(
    (t) => t.id === activeTrackId,
  );

  const upsertTrack = React.useCallback((music: Music) => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === music.id);
      if (idx === -1) return [music, ...prev];
      const next = [...prev];
      next[idx] = music;
      return next;
    });
  }, []);

  const replaceTrack = React.useCallback(
    (placeholderId: string, music: Music) => {
      setTracks((prev) => [
        music,
        ...prev.filter((t) => t.id !== placeholderId && t.id !== music.id),
      ]);
    },
    [],
  );

  const removeTrack = React.useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }, []);

  const poll = React.useCallback(
    (id: string) => {
      if (polling.current.has(id)) return;
      polling.current.set(id, Date.now());

      const tick = async () => {
        try {
          const res = await fetch(`/api/music/${id}`);
          const json = (await res.json()) as { music?: Music };
          if (json.music) {
            upsertTrack(json.music);
            genCallbackRef.current(json.music);
            const done =
              json.music.status === "completed" ||
              json.music.status === "failed";
            const thumbnailSettled = json.music.thumbnail_status !== "pending";
            if (done && thumbnailSettled) {
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
      if (track.id.startsWith(OPTIMISTIC_TRACK_PREFIX)) return;
      const needsGenPoll =
        track.status === "pending" || track.status === "processing";
      const needsThumbnailPoll =
        track.status === "completed" && track.thumbnail_status === "pending";
      if (needsGenPoll || needsThumbnailPoll) {
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

  React.useEffect(() => {
    genCallbackRef.current = (music: Music) => {
      if (music.id !== genMusicIdRef.current) return;
      if (music.status === "completed") {
        genMusicIdRef.current = null;
        setReadyMusic(music);
        setGenPhase("success");
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

  const persistTrackDuration = React.useCallback(
    async (trackId: string, seconds: number) => {
      const roundedSeconds = Math.round(seconds);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? { ...t, duration_seconds: roundedSeconds } : t,
        ),
      );
      try {
        const res = await fetch(`/api/music/${trackId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration_seconds: roundedSeconds }),
        });
        const json = (await res.json().catch(() => ({}))) as { music?: Music };
        if (res.ok && json.music) upsertTrack(json.music);
      } catch (err) {
        console.error("duration persist failed", err);
      }
    },
    [upsertTrack],
  );

  const handlePrevTrack = React.useCallback(async () => {
    if (activeCompletedIndex <= 0) return;
    await loadAndPlayTrack(completedTracks[activeCompletedIndex - 1]);
  }, [activeCompletedIndex, completedTracks, loadAndPlayTrack]);

  const handleNextTrack = React.useCallback(async () => {
    if (
      activeCompletedIndex < 0 ||
      activeCompletedIndex >= completedTracks.length - 1
    )
      return;
    await loadAndPlayTrack(completedTracks[activeCompletedIndex + 1]);
  }, [activeCompletedIndex, completedTracks, loadAndPlayTrack]);

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

  const handleSend = React.useCallback(
    async (payload: GenerateRequest) => {
      const optimisticTrack = createOptimisticTrack(payload);
      setInitialLoading(false);
      setError(null);
      upsertTrack(optimisticTrack);
      setGenPhase("generating");
      setGenStartMs(Date.now());

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
          setGenPhase("idle");
          const reason = json.error || `HTTP ${res.status}` || "unknown";
          console.error("generate failed:", res.status, raw);
          if (typeof json.remaining_credit === "number") {
            onRemainingCreditChange?.(json.remaining_credit);
          }
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
        if (typeof json.remaining_credit === "number") {
          onRemainingCreditChange?.(json.remaining_credit);
        }
        setError(null);
        replaceTrack(optimisticTrack.id, json.music);
        genMusicIdRef.current = json.music.id;
        poll(json.music.id);
      } catch (err) {
        console.error("generate request failed", err);
        setGenPhase("idle");
        removeTrack(optimisticTrack.id);
        setError("Request failed. Check your network and try again.");
      }
    },
    [
      onOpenCreditModal,
      onRemainingCreditChange,
      poll,
      removeTrack,
      replaceTrack,
      upsertTrack,
    ],
  );

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
        const res = await fetch(`/api/music/${track.id}`, {
          method: "DELETE",
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!res.ok) {
          setError(json.error || `Delete failed (${res.status})`);
          return;
        }
        setError(null);
        if (activeTrackId === track.id) handleClosePlayer();
        setTracks((prev) => prev.filter((t) => t.id !== track.id));
      } catch (err) {
        console.error("delete failed", err);
        setError("Delete failed. Check your network and try again.");
      } finally {
        setBusyId(null);
      }
    },
    [activeTrackId, handleClosePlayer],
  );

  // --- Derived state ---

  const filteredTracks = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter((t) =>
      [t.title, t.prompt, t.status]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(needle)),
    );
  }, [query, tracks]);

  const totalPages = Math.max(1, Math.ceil(filteredTracks.length / PAGE_SIZE));

  const [prevQuery, setPrevQuery] = React.useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setPage(0);
  }

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

  // --- Render ---

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto flex w-full max-w-none flex-col px-4 py-4 sm:px-10 sm:py-7 lg:px-12">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5 sm:gap-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
                Library
              </p>
              <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.045em] text-[#f4f1ea] sm:mt-2 sm:text-4xl">
                My music
              </h1>
            </div>
            <div className="w-auto shrink-0">
              <MusicComposer
                compact
                disabled={genPhase === "generating"}
                onOpen={() => {
                  setError(null);
                  setCreateModalOpen(true);
                }}
              />
            </div>
          </div>
          <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:pb-5">
            <p className="text-base text-white/45 sm:text-lg">
              {filteredTracks.length} generated {filteredTracks.length === 1 ? "track" : "tracks"}
            </p>
            <label className="flex w-full items-center gap-3 border-b border-white/20 pb-2 text-white/45 focus-within:border-white/55 sm:max-w-[465px] sm:pb-3">
              <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" /><path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search library"
                placeholder="Search library"
                className="min-w-0 flex-1 bg-transparent text-base text-[#f4f1ea] outline-none placeholder:text-white/40 sm:text-lg"
              />
            </label>
          </div>
          {initialLoading ? (
            <TrackListSkeleton />
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-white/40">
              <p className="text-sm">Create a song and it will appear here.</p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-white/40">
              <p className="text-sm">No tracks match your search.</p>
            </div>
          ) : (
            <TrackList
              tracks={pagedTracks}
              busyId={busyId}
              openMenuId={openMenuId}
              activeTrackId={activeTrackId}
              playingId={playing ? activeTrackId : null}
              renamingId={renamingId}
              renameDraft={renameDraft}
              confirmDeleteId={confirmDeleteId}
              page={safePage}
              totalPages={totalPages}
              onGoToPage={goToPage}
              onTogglePlayback={handleToggleTrackPlayback}
              onToggleMenu={(trackId) => {
                setConfirmDeleteId(null);
                setOpenMenuId((id) => (id === trackId ? null : trackId));
              }}
              onRenameDraftChange={setRenameDraft}
              onStartRename={handleStartRename}
              onCommitRename={handleCommitRename}
              onCancelRename={handleCancelRename}
              onRequestDelete={(trackId) => setConfirmDeleteId(trackId)}
              onConfirmDelete={handleDelete}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          )}
        </div>
      </div>

      {activeTrack?.audio_url && (
        <div className="w-full shrink-0 px-2 py-2 sm:px-4 sm:py-4 sm:pb-6">
          <MiniPlayer
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
            onPrev={activeCompletedIndex > 0 ? handlePrevTrack : undefined}
            onNext={
              activeCompletedIndex < completedTracks.length - 1
                ? handleNextTrack
                : undefined
            }
          />
        </div>
      )}

      <CreateSongModal
        open={createModalOpen}
        phase={genPhase}
        readyMusic={readyMusic}
        refundStatus={genRefundStatus}
        remainingCredits={remainingCredit}
        generationStartMs={genStartMs}
        error={error}
        onSubmit={(payload) => {
          setReadyMusic(null);
          void handleSend(payload);
        }}
        onClose={() => {
          if (genPhase !== "generating") {
            setGenPhase("idle");
            setReadyMusic(null);
          }
          setCreateModalOpen(false);
        }}
        onOpenCreditModal={onOpenCreditModal ?? (() => {})}
        onListenNow={(music) => {
          void loadAndPlayTrack(music);
          setReadyMusic(null);
          setGenPhase("idle");
          setCreateModalOpen(false);
        }}
        onReturnToEditor={() => {
          setError(null);
          setGenPhase("idle");
        }}
      />

      {fullscreenOpen && activeTrack && (
        <FullScreenPlayer
          track={activeTrack}
          playing={playing}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onTogglePlay={handleTogglePlayerPlayback}
          onSeek={handleSeek}
          onVolumeChange={setVolume}
          onClose={() => setFullscreenOpen(false)}
          onPrev={activeCompletedIndex > 0 ? handlePrevTrack : undefined}
          onNext={
            activeCompletedIndex < completedTracks.length - 1
              ? handleNextTrack
              : undefined
          }
        />
      )}

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
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
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

function createOptimisticTrack(payload: GenerateRequest): Music {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `${OPTIMISTIC_TRACK_PREFIX}${crypto.randomUUID()}`
      : `${OPTIMISTIC_TRACK_PREFIX}${Date.now()}`;
  return {
    id,
    user_id: "pending",
    title: "Starting your track...",
    prompt: payload.prompt,
    status: "pending",
    audio_url: null,
    audio_key: null,
    cover_url: null,
    cover_key: null,
    thumbnail_url: null,
    thumbnail_key: null,
    thumbnail_prompt: null,
    thumbnail_status: null,
    duration_seconds: null,
    model: null,
    is_public: false,
    error_message: null,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
}
