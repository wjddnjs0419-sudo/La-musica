-- Backfill lyrics_sync_status for pre-existing completed tracks.
--
-- Without this, every completed row lacking an explicit lyrics_sync_status
-- key derives to "pending" the first time it's read after the synced-lyrics
-- feature ships (see lib/lyrics/sync.ts deriveLyricsSyncStatus), and the
-- workspace's mount-time poll effect (components/workspace/WorkspaceShell.tsx)
-- would kick off a real Gemini audio-alignment call for every such track on
-- the very first page load — an uncontrolled bulk backfill instead of only
-- auto-syncing newly generated tracks going forward.
UPDATE public.musics
SET metadata = jsonb_set(metadata, '{lyrics_sync_status}', '"skipped"')
WHERE status = 'completed'
  AND (metadata ->> 'lyrics_sync_status') IS NULL;
