# RESULT: HelloTalk beta coupon credits - 2026-06-18

## Background
- Request: Give selected HelloTalk testers 1 free song credit through a limited invite code, without giving every new signup an automatic free credit.
- Decision: Keep all credit mutation server-side in Postgres, expose only an authenticated redemption API, and seed `HELLOTALK-BETA` as a 20-use coupon.

## Implementation
- **`migrations/20260617185555_credit-coupons.sql`**: added `credit_coupons`, `credit_coupon_redemptions`, normalized uppercase coupon codes, unique `(coupon_id, user_id)` redemption protection, RLS with no public table access, and `redeem_credit_coupon(input_code text)`.
- **Atomic redemption**: the RPC locks the coupon row with `FOR UPDATE`, checks active/start/expiry/sold-out/already-used states, grants `user_credits`, increments `redeemed_count`, writes a redemption row, and records a `public.payments` ledger row with `provider='coupon'` and `status='redeemed'`.
- **Seed coupon**: migration inserted `HELLOTALK-BETA` with `source='hellotalk'`, `credit_amount=1`, `max_redemptions=20`, active immediately, and a 7-day expiry from migration apply time.
- **`app/api/credits/redeem-coupon/route.ts`**: added authenticated `POST /api/credits/redeem-coupon` with body validation and stable error codes.
- **`components/credit-modal.tsx`** and **`components/workspace-shell.tsx`**: added a small "Have a beta code?" redemption UI in the Upgrade modal and refreshed the workspace credit count after success.
- **`app/api/auth/callback/route.ts`** and **`.env.example`**: disabled automatic signup/login free credits by default; legacy behavior only runs with `ENABLE_SIGNUP_FREE_CREDIT=true`.
- **`docs/credit-coupons.md`**: documented HelloTalk coupon SQL, usage checks, extension, and disable commands.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Migration apply | `npx @insforge/cli db migrations up 20260617185555_credit-coupons.sql` | Passed |
| HelloTalk seed | DB query for `HELLOTALK-BETA` | Passed: 1 credit, 20 max, 0 redeemed |
| Ledger constraints | DB query for `payments_provider_check` / `payments_status_check` | Passed: includes `coupon` and `redeemed` |
| Unauthenticated RPC/API | DB function call and local `POST /api/credits/redeem-coupon` without cookies | Passed: `unauthenticated` |
| Next build + typecheck | `npm run build` | Passed |
| Full codebase lint | `npm run lint` | Passed |

## Lessons
- Coupon grants belong in a database RPC, not client code, because the coupon counter, one-use rule, ledger row, and credit balance need to commit or roll back together.
- The existing Upgrade modal was the right surface: it keeps paid credits and invite credits in one place without exposing coupon management publicly.
