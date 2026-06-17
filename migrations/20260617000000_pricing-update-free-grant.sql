-- Pricing update: Viral Pack 50 -> 35 credits (margin), and a one-time
-- free credit grant (1 song) for new users on first login.

-- 1) Keep the Polar fulfillment plan->credit map in sync with lib/credits.ts.
--    Without this, viral-pack orders fail the credit_plan_mismatch guard.
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
    WHEN 'viral-pack' THEN 35
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

-- 2) One-time free credit grant. Idempotent: ON CONFLICT DO NOTHING means an
--    existing user_credits row (from a prior grant or any purchase) is never
--    topped up, so callers can invoke this on every login safely.
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
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_count > 0 THEN 'granted' ELSE 'skipped' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_free_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_free_credit(UUID) TO project_admin;
