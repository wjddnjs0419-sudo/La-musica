-- Stripe Checkout wiring for credit purchases.
-- Users start a checkout from the pricing section / upgrade modal; fulfillment
-- (marking the payment paid + granting credits) happens from verified webhook
-- events, never from the success URL.

-- 1. Let authenticated users create their own checkout attempts.
ALTER TABLE payments.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users create their stripe checkout sessions"
  ON payments.stripe_checkout_sessions
  FOR INSERT TO authenticated
  WITH CHECK (subject_type = 'user' AND subject_id = (SELECT auth.uid())::text);

CREATE POLICY "users read their stripe checkout sessions"
  ON payments.stripe_checkout_sessions
  FOR SELECT TO authenticated
  USING (subject_type = 'user' AND subject_id = (SELECT auth.uid())::text);

-- 2. Allow users to create their own pending payment rows.
CREATE POLICY "create own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT INSERT ON public.payments TO authenticated;

-- 3. Fulfillment: when a Stripe payment webhook is processed, mark the matching
--    pending payment paid and grant the credits exactly once.
CREATE OR REPLACE FUNCTION public.fulfill_stripe_credit_purchase()
RETURNS TRIGGER AS $$
DECLARE
  v_payment_id UUID;
  v_credit INTEGER;
  v_user_id UUID;
BEGIN
  IF NEW.provider = 'stripe'
     AND NEW.processing_status = 'processed'
     AND NEW.event_type IN (
       'checkout.session.completed',
       'checkout.session.async_payment_succeeded',
       'payment_intent.succeeded'
     )
     AND (NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'payment_id') IS NOT NULL THEN

    v_payment_id := (NEW.payload -> 'data' -> 'object' -> 'metadata' ->> 'payment_id')::uuid;

    -- The status = 'pending' guard makes repeated/out-of-order events idempotent:
    -- only the first processed event credits the user.
    UPDATE public.payments
       SET status = 'paid',
           provider_payment_id = COALESCE(
             NEW.payload -> 'data' -> 'object' ->> 'id',
             provider_payment_id
           ),
           updated_at = now()
     WHERE id = v_payment_id
       AND status = 'pending'
    RETURNING credit, user_id INTO v_credit, v_user_id;

    IF v_credit IS NOT NULL THEN
      INSERT INTO public.user_credits (user_id, credit)
      VALUES (v_user_id, v_credit)
      ON CONFLICT (user_id) DO UPDATE
        SET credit = public.user_credits.credit + EXCLUDED.credit,
            updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER fulfill_stripe_credit_purchase_from_webhook
  AFTER INSERT OR UPDATE ON payments.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fulfill_stripe_credit_purchase();
