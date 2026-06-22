-- Temporarily shelve the coupon-based free-credit campaign without deleting
-- coupon tables, redemption history, or the redeem_credit_coupon RPC.
UPDATE public.credit_coupons
SET is_active = false,
    updated_at = now()
WHERE is_active = true;
