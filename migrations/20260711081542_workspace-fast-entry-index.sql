CREATE INDEX IF NOT EXISTS idx_musics_user_id_created_at
  ON public.musics(user_id, created_at DESC);
