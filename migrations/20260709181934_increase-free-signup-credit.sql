-- Raise the one-time signup free credit from 1 song to 5 songs.
-- ACE-Step's per-song Replicate cost (~$0.032, measured) is roughly a fifth
-- of MiniMax's flat $0.15/output, so 5 free songs now costs less than the
-- old 1-song grant did. Still idempotent: ON CONFLICT DO NOTHING means
-- existing user_credits rows (prior grant or any purchase) are never
-- topped up, so this is safe to invoke on every login.
CREATE OR REPLACE FUNCTION public.grant_free_credit(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  INSERT INTO public.user_credits (user_id, credit)
  VALUES (p_user_id, 5)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_count > 0 THEN 'granted' ELSE 'skipped' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_free_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_free_credit(UUID) TO project_admin;
