-- musics: AI-generated music records owned by users
CREATE TABLE public.musics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  audio_url TEXT,
  audio_key TEXT,
  cover_url TEXT,
  cover_key TEXT,
  duration_seconds INTEGER,
  model TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.musics ENABLE ROW LEVEL SECURITY;

-- Owners read their rows; anyone reads public ones
CREATE POLICY "read own or public" ON public.musics
  FOR SELECT TO anon, authenticated
  USING (is_public OR user_id = (SELECT auth.uid()));

CREATE POLICY "owner insert" ON public.musics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner update" ON public.musics
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "owner delete" ON public.musics
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_id is immutable after insert
CREATE OR REPLACE FUNCTION public.prevent_music_owner_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_music_owner_change
  BEFORE UPDATE ON public.musics
  FOR EACH ROW EXECUTE FUNCTION public.prevent_music_owner_change();

CREATE TRIGGER musics_updated_at
  BEFORE UPDATE ON public.musics
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE INDEX idx_musics_user_id ON public.musics(user_id);
CREATE INDEX idx_musics_created_at ON public.musics(created_at DESC);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.musics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.musics TO authenticated;
