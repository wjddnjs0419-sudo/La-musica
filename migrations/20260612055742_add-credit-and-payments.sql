-- App-owned credit balances. auth.users remains an InsForge-managed table.
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credit INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own credit" ON public.user_credits
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TRIGGER user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

-- Minimal app payment ledger for credit purchases.
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit INTEGER NOT NULL CHECK (credit > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency = lower(currency) AND length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (provider IN ('stripe', 'razorpay', 'manual')),
  provider_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own payments" ON public.payments
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION system.update_updated_at();

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE UNIQUE INDEX idx_payments_provider_payment_id
  ON public.payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON public.user_credits FROM anon, authenticated;
GRANT SELECT ON public.user_credits TO authenticated;

REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
