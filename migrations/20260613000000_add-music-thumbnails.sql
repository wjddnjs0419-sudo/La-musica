ALTER TABLE public.musics
  ADD COLUMN thumbnail_url TEXT,
  ADD COLUMN thumbnail_key TEXT,
  ADD COLUMN thumbnail_prompt TEXT,
  ADD COLUMN thumbnail_status TEXT
    CHECK (thumbnail_status IN ('pending', 'succeeded', 'failed'));

CREATE INDEX idx_musics_thumbnail_status
  ON public.musics(thumbnail_status)
  WHERE thumbnail_status IS NOT NULL;
