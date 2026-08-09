-- Remove Gemini audio-alignment lyrics-sync bookkeeping keys from metadata.
--
-- The synced-lyrics feature (lib/lyrics/sync.ts, lib/lyrics/ensureLyricsSync.ts)
-- was removed as MVP overspec — highlighting now only uses the API-free
-- approximate (evenly-distributed) timing in lib/player/lyrics.ts. No row
-- ever had lyrics_lrc populated (checked before writing this migration), so
-- this only drops now-dead status/bookkeeping keys; lyrics/lyrics_payload
-- (the actual lyric text) are untouched.
UPDATE public.musics
SET metadata = metadata
  - 'lyrics_sync_status'
  - 'lyrics_sync_error'
  - 'lyrics_sync_started_at'
  - 'lyrics_synced_at'
  - 'lyrics_sync_model'
  - 'lyrics_lrc'
WHERE metadata ?| array[
  'lyrics_sync_status',
  'lyrics_sync_error',
  'lyrics_sync_started_at',
  'lyrics_synced_at',
  'lyrics_sync_model',
  'lyrics_lrc'
];
