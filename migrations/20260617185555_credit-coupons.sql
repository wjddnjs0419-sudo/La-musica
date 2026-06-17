ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_provider_check
  CHECK (provider IN ('stripe', 'razorpay', 'manual', 'polar', 'coupon'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'redeemed'));

CREATE TABLE public.credit_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  source TEXT,
  credit_amount INTEGER NOT NULL DEFAULT 1 CHECK (credit_amount > 0),
  max_redemptions INTEGER NOT NULL CHECK (max_redemptions > 0),
  redeemed_count INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_coupons_code_normalized
    CHECK (code = upper(btrim(code)) AND code <> ''),
  CONSTRAINT credit_coupons_redeemed_count_bounds
    CHECK (redeemed_count <= max_redemptions),
  CONSTRAINT credit_coupons_valid_window
    CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);

CREATE TABLE public.credit_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.credit_coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  credits_granted INTEGER NOT NULL CHECK (credits_granted > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT credit_coupon_redemptions_coupon_user_key UNIQUE (coupon_id, user_id)
);

ALTER TABLE public.credit_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER credit_coupons_updated_at
  BEFORE UPDATE ON public.credit_coupons
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE INDEX idx_credit_coupons_code ON public.credit_coupons(code);
CREATE INDEX idx_credit_coupon_redemptions_user_id
  ON public.credit_coupon_redemptions(user_id);
CREATE INDEX idx_credit_coupon_redemptions_coupon_id
  ON public.credit_coupon_redemptions(coupon_id);

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON public.credit_coupons FROM anon, authenticated;
REVOKE ALL ON public.credit_coupon_redemptions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.redeem_credit_coupon(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT := upper(btrim(coalesce(input_code, '')));
  v_coupon public.credit_coupons%ROWTYPE;
  v_redemption_id UUID;
  v_email TEXT;
  v_credit_balance INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'unauthenticated');
  END IF;

  IF v_code = '' OR length(v_code) > 128 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_coupon');
  END IF;

  SELECT *
  INTO v_coupon
  FROM public.credit_coupons
  WHERE code = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_coupon');
  END IF;

  IF v_coupon.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'code', 'coupon_inactive');
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'coupon_not_started');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND now() >= v_coupon.expires_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'coupon_expired');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.credit_coupon_redemptions
    WHERE coupon_id = v_coupon.id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_redeemed');
  END IF;

  IF v_coupon.redeemed_count >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object('ok', false, 'code', 'coupon_sold_out');
  END IF;

  SELECT email
  INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  INSERT INTO public.credit_coupon_redemptions (
    coupon_id,
    user_id,
    email,
    credits_granted
  )
  VALUES (
    v_coupon.id,
    v_user_id,
    v_email,
    v_coupon.credit_amount
  )
  ON CONFLICT (coupon_id, user_id) DO NOTHING
  RETURNING id INTO v_redemption_id;

  IF v_redemption_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_redeemed');
  END IF;

  INSERT INTO public.user_credits (user_id, credit)
  VALUES (v_user_id, v_coupon.credit_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET
    credit = public.user_credits.credit + excluded.credit,
    updated_at = now();

  UPDATE public.credit_coupons
  SET redeemed_count = redeemed_count + 1,
      updated_at = now()
  WHERE id = v_coupon.id;

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
    v_user_id,
    v_coupon.credit_amount,
    0,
    'usd',
    'redeemed',
    'coupon',
    'coupon:' || v_redemption_id::text
  );

  SELECT credit
  INTO v_credit_balance
  FROM public.user_credits
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'redeemed',
    'couponCode', v_coupon.code,
    'creditsGranted', v_coupon.credit_amount,
    'creditBalance', coalesce(v_credit_balance, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_credit_coupon(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_credit_coupon(TEXT) TO authenticated, project_admin;

INSERT INTO public.credit_coupons (
  code,
  description,
  source,
  credit_amount,
  max_redemptions,
  is_active,
  starts_at,
  expires_at
)
VALUES (
  'HELLOTALK-BETA',
  'HelloTalk beta tester invite code',
  'hellotalk',
  1,
  20,
  true,
  now(),
  now() + interval '7 days'
)
ON CONFLICT (code)
DO UPDATE SET
  description = excluded.description,
  source = excluded.source,
  credit_amount = excluded.credit_amount,
  max_redemptions = greatest(
    public.credit_coupons.max_redemptions,
    excluded.max_redemptions
  ),
  is_active = true,
  starts_at = coalesce(public.credit_coupons.starts_at, excluded.starts_at),
  expires_at = coalesce(public.credit_coupons.expires_at, excluded.expires_at),
  updated_at = now();
