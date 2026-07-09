# Credit Coupons

La Musica grants five free credits on signup through the idempotent
`grant_free_credit` RPC. Coupon redemption remains available for temporary beta
campaigns, but active coupons can be shelved without deleting the coupon tables,
RPC, or redemption history.

## HelloTalk Beta

The `20260617185555_credit-coupons.sql` migration creates this coupon:

```sql
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
);
```

## Useful Admin SQL

Check usage:

```sql
SELECT
  code,
  source,
  credit_amount,
  redeemed_count,
  max_redemptions,
  is_active,
  starts_at,
  expires_at
FROM public.credit_coupons
WHERE code = 'HELLOTALK-BETA';
```

Extend the campaign:

```sql
UPDATE public.credit_coupons
SET expires_at = now() + interval '7 days',
    max_redemptions = 20,
    is_active = true
WHERE code = 'HELLOTALK-BETA';
```

Disable the coupon:

```sql
UPDATE public.credit_coupons
SET is_active = false
WHERE code = 'HELLOTALK-BETA';
```
