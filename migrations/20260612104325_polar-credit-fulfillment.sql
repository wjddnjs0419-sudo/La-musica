ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('stripe', 'razorpay', 'manual', 'polar'));

CREATE OR REPLACE FUNCTION public.fulfill_polar_credit_order(
  p_user_id UUID,
  p_order_id TEXT,
  p_plan_id TEXT,
  p_credit INTEGER,
  p_amount_cents INTEGER,
  p_currency TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_payment_id UUID;
  v_credit INTEGER;
  v_currency TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'order_id_required';
  END IF;

  v_credit := CASE p_plan_id
    WHEN 'starter' THEN 5
    WHEN 'creator' THEN 20
    WHEN 'viral-pack' THEN 50
    ELSE NULL
  END;

  IF v_credit IS NULL THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  IF p_credit IS DISTINCT FROM v_credit THEN
    RAISE EXCEPTION 'credit_plan_mismatch';
  END IF;

  v_currency := lower(coalesce(nullif(btrim(p_currency), ''), 'usd'));
  IF length(v_currency) <> 3 THEN
    RAISE EXCEPTION 'invalid_currency';
  END IF;

  INSERT INTO public.payments (
    user_id,
    credit,
    amount_cents,
    currency,
    status,
    provider,
    provider_payment_id
  )
  VALUES (
    p_user_id,
    v_credit,
    greatest(coalesce(p_amount_cents, 0), 0),
    v_currency,
    'paid',
    'polar',
    p_order_id
  )
  ON CONFLICT (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  INSERT INTO public.user_credits (user_id, credit)
  VALUES (p_user_id, v_credit)
  ON CONFLICT (user_id)
  DO UPDATE SET
    credit = public.user_credits.credit + excluded.credit,
    updated_at = now();

  RETURN jsonb_build_object(
    'status', 'credited',
    'payment_id', v_payment_id,
    'credit', v_credit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_music_with_credit(
  p_user_id UUID,
  p_prompt TEXT,
  p_title TEXT,
  p_model TEXT,
  p_metadata JSONB
)
RETURNS public.musics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_music public.musics;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id_required';
  END IF;

  IF p_prompt IS NULL OR btrim(p_prompt) = '' THEN
    RAISE EXCEPTION 'prompt_required';
  END IF;

  UPDATE public.user_credits
  SET credit = credit - 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND credit >= 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_credit';
  END IF;

  INSERT INTO public.musics (
    user_id,
    prompt,
    title,
    status,
    model,
    duration_seconds,
    metadata
  )
  VALUES (
    p_user_id,
    btrim(p_prompt),
    coalesce(nullif(btrim(p_title), ''), 'Untitled'),
    'pending',
    p_model,
    NULL,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('credit_spent', 1)
  )
  RETURNING * INTO v_music;

  RETURN v_music;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_failed_music_credit(
  p_user_id UUID,
  p_music_id UUID,
  p_message TEXT
)
RETURNS public.musics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_music public.musics;
BEGIN
  SELECT *
  INTO v_music
  FROM public.musics
  WHERE id = p_music_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'music_not_found';
  END IF;

  IF coalesce(v_music.metadata->>'credit_refunded', 'false') <> 'true' THEN
    INSERT INTO public.user_credits (user_id, credit)
    VALUES (p_user_id, 1)
    ON CONFLICT (user_id)
    DO UPDATE SET
      credit = public.user_credits.credit + 1,
      updated_at = now();
  END IF;

  UPDATE public.musics
  SET status = 'failed',
      error_message = coalesce(nullif(btrim(p_message), ''), 'generation failed'),
      metadata = v_music.metadata || jsonb_build_object('credit_refunded', true)
  WHERE id = p_music_id
    AND user_id = p_user_id
  RETURNING * INTO v_music;

  RETURN v_music;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_polar_credit_order(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_music_with_credit(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_failed_music_credit(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fulfill_polar_credit_order(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO project_admin;
GRANT EXECUTE ON FUNCTION public.create_music_with_credit(UUID, TEXT, TEXT, TEXT, JSONB) TO project_admin;
GRANT EXECUTE ON FUNCTION public.refund_failed_music_credit(UUID, UUID, TEXT) TO project_admin;
