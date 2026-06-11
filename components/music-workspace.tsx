"use client";

import * as React from "react";
import { PromptBox } from "@/components/prompt-box";
import type { Music, GenerateRequest } from "@/lib/music";

const POLL_INTERVAL = 3000;

export default function MusicWorkspace() {
  const [tracks, setTracks] = React.useState<Music[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const polling = React.useRef<Set<string>>(new Set());

  const upsertTrack = React.useCallback((music: Music) => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === music.id);
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
          const json = await res.json();
          if (json.music) {
            upsertTrack(json.music);
            if (json.music.status === "completed" || json.music.status === "failed") {
              polling.current.delete(id);
              return;
            }
          }
        } catch {
          // network blip — keep polling
        }
        window.setTimeout(tick, POLL_INTERVAL);
      };

      window.setTimeout(tick, POLL_INTERVAL);
    },
    [upsertTrack],
  );

  const handleSend = React.useCallback(
    async (payload: GenerateRequest) => {
      try {
        const res = await fetch("/api/music/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw = await res.text();
        let json: { music?: Music; error?: string } = {};
        try {
          json = raw ? JSON.parse(raw) : {};
        } catch {
          json = {};
        }
        if (!res.ok || !json.music) {
          const reason = json.error || `HTTP ${res.status}` || "unknown";
          console.error("generate failed:", res.status, raw);
          setError(reason);
          return;
        }
        setError(null);
        upsertTrack(json.music);
        poll(json.music.id);
      } catch (err) {
        console.error("generate request failed", err);
        setError("요청 실패 (네트워크)");
      }
    },
    [poll, upsertTrack],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-6">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-white/40">
              <p className="text-sm">프롬프트를 입력해 음악을 만들어보세요</p>
            </div>
          ) : (
            tracks.map((track) => <TrackCard key={track.id} track={track} />)
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        {error && (
          <p className="mb-2 px-2 text-xs text-red-400/80">에러: {error}</p>
        )}
        <PromptBox onSend={handleSend} />
      </div>
    </div>
  );
}

function TrackCard({ track }: { track: Music }) {
  const pending = track.status === "pending" || track.status === "processing";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90">{track.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-white/40">{track.prompt}</p>
        </div>
        <StatusBadge status={track.status} />
      </div>

      {track.status === "completed" && track.audio_url && (
        <audio
          controls
          src={track.audio_url}
          className="mt-3 w-full"
          preload="none"
        />
      )}

      {pending && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
          음악을 생성하는 중...
        </div>
      )}

      {track.status === "failed" && (
        <p className="mt-3 text-xs text-red-400/80">
          생성 실패{track.error_message ? `: ${track.error_message}` : ""}
        </p>
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
    pending: "대기",
    processing: "생성 중",
    completed: "완료",
    failed: "실패",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
