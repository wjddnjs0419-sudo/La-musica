import { after } from "next/server";
import type { createInsforgeAdminClient } from "../insforge-admin";
import type { Music } from "../music";
import {
  generateLyricsLrcFromAudio,
  getLyricsSyncStatus,
  resolveLyricsSyncText,
} from "./sync";

type AdminClient = ReturnType<typeof createInsforgeAdminClient>;

// If a row has been "syncing" longer than this, the background job that set
// it is presumed dead (e.g. the serverless invocation was torn down before
// `after()` finished) and a fresh attempt is allowed.
const STALE_SYNCING_MS = 3 * 60 * 1000;

// Guards an update against the exact lyrics_sync_status value this call
// observed, so a concurrent caller that observed the same "eligible" state
// can't also win the race: the loser's write matches 0 rows.
function guardOnObservedStatus<
  Q extends { eq: (col: string, val: unknown) => Q; is: (col: string, val: unknown) => Q },
>(query: Q, explicitStatus: unknown): Q {
  return typeof explicitStatus === "string"
    ? query.eq("metadata->>lyrics_sync_status", explicitStatus)
    : query.is("metadata->lyrics_sync_status", null);
}

// Single entry point for both the client poll route and the reconcile cron.
// Starts (or restarts, if stale) the background LRC alignment job for a
// completed track and returns the row reflecting whatever this call did.
export async function ensureLyricsSyncStarted(
  admin: AdminClient,
  music: Music,
  now: number = Date.now(),
): Promise<Music> {
  if (music.status !== "completed" || !music.audio_url) return music;

  const explicitStatus = music.metadata?.lyrics_sync_status;
  const observedStatus = getLyricsSyncStatus(music.metadata);

  const startedAt = music.metadata?.lyrics_sync_started_at;
  const isStaleSyncing =
    observedStatus === "syncing" &&
    typeof startedAt === "string" &&
    now - new Date(startedAt).getTime() > STALE_SYNCING_MS;

  if (observedStatus !== "pending" && !isStaleSyncing) return music;

  const nextMetadata = {
    ...music.metadata,
    lyrics_sync_status: "syncing",
    lyrics_sync_started_at: new Date(now).toISOString(),
    lyrics_sync_error: null,
  };

  const { data: updated, error } = await guardOnObservedStatus(
    admin.database.from("musics").update({ metadata: nextMetadata }).eq("id", music.id),
    explicitStatus,
  )
    .select()
    .maybeSingle();

  if (error) {
    console.error("lyrics sync start failed", { musicId: music.id, error });
    return music;
  }
  if (!updated) {
    // CAS guard didn't match — another process already claimed this row.
    return music;
  }

  const syncingMusic = updated as Music;
  after(() =>
    syncLyricsInBackground(admin, syncingMusic).catch((err) =>
      console.error("lyrics sync background failed", { musicId: music.id, err }),
    ),
  );
  return syncingMusic;
}

async function syncLyricsInBackground(
  admin: AdminClient,
  music: Music,
): Promise<Music | null> {
  const lyrics = resolveLyricsSyncText(music.metadata);
  if (!music.audio_url || !lyrics) {
    return updateMusicMetadata(admin, music.id, (metadata) => ({
      ...metadata,
      lyrics_sync_status: "skipped",
      lyrics_sync_error: null,
    }));
  }

  try {
    const { lrc, model } = await generateLyricsLrcFromAudio({
      audioUrl: music.audio_url,
      lyrics,
      durationSeconds: music.duration_seconds,
    });

    return updateMusicMetadata(admin, music.id, (metadata) => ({
      ...metadata,
      lyrics_lrc: lrc,
      lyrics_sync_status: "synced",
      lyrics_sync_model: model,
      lyrics_sync_error: null,
      lyrics_synced_at: new Date().toISOString(),
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "lyrics_sync_failed";
    const status = message === "lyrics_sync_skipped" ? "skipped" : "failed";

    return updateMusicMetadata(admin, music.id, (metadata) => ({
      ...metadata,
      lyrics_sync_status: status,
      lyrics_sync_error: status === "failed" ? message : null,
    }));
  }
}

// Finalizes the sync outcome, but only while the row is still "syncing" —
// a late-finishing duplicate run (see the CAS guard above) can't clobber a
// result someone else already wrote.
async function updateMusicMetadata(
  admin: AdminClient,
  musicId: string,
  updater: (metadata: Record<string, unknown>) => Record<string, unknown>,
): Promise<Music | null> {
  const { data: current, error: readError } = await admin.database
    .from("musics")
    .select()
    .eq("id", musicId)
    .maybeSingle();

  if (readError || !current) {
    console.error("lyrics sync metadata read failed", { musicId, readError });
    return null;
  }

  const music = current as Music;
  const { data: updated, error: updateError } = await admin.database
    .from("musics")
    .update({ metadata: updater(music.metadata ?? {}) })
    .eq("id", musicId)
    .eq("metadata->>lyrics_sync_status", "syncing")
    .select()
    .maybeSingle();

  if (updateError) {
    console.error("lyrics sync metadata update failed", { musicId, updateError });
    return null;
  }
  if (!updated) {
    console.warn("lyrics sync metadata update skipped — status changed concurrently", {
      musicId,
    });
    return null;
  }

  return updated as Music;
}
