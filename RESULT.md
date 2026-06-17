# RESULT: Pricing update — Viral 35곡 + Free 가입 1곡 지급 - 2026-06-17

## Background
- Request: 결제 플랜 개편. 표 기준 — Free(가입 1곡), Starter $2.99/5곡(유지), Creator $7.99/20곡(유지), Viral $14.99/50곡 → **30~35곡**(마진 방어), Trial $1.99/2곡 검토.
- 확정 결정(질문 통해): **Viral 35곡**, **Trial 생략**, **Free = 가입 시 1곡 자동 지급**(UI 노출 없이 로직만).
- 가격 동일($14.99 유지) → Polar 신규 제품/env 불필요. 크레딧 수만 변경.

## Implementation
- **`lib/credits.ts`**: `viral-pack` credits `50 → 35`. 단일 출처라 가격 UI "{credits} songs" 표기·웹훅 충전량 자동 반영.
- **`migrations/20260617000000_pricing-update-free-grant.sql`** (신규):
  - `fulfill_polar_credit_order` RPC 의 하드코딩 플랜→크레딧 맵 `viral-pack 50 → 35` 동기화. (안 고치면 충전 시 `credit_plan_mismatch` 로 실패 — RPC 에 검증 가드 존재.)
  - 신규 `grant_free_credit(p_user_id)` SECURITY DEFINER 함수: `INSERT user_credits(user_id, 1) ON CONFLICT (user_id) DO NOTHING`. 멱등 — 크레딧 행이 없는 신규 유저 최초 1회만 지급, 기존 행(구매·재로그인)은 무변경. `project_admin` 에 GRANT.
- **`app/api/auth/callback/route.ts`**: OAuth 코드 교환 성공 후 admin 클라이언트로 `grant_free_credit` 호출. Google OAuth 가 유일 로그인 경로라 신규 유저가 반드시 통과. try/catch 로 감싸 지급 실패해도 로그인은 안 막음.
- **삭제**: `migrations/20260614000000_add-stripe-checkout.sql` — 미적용 + 앱은 Polar 만 사용(Stripe 경로 코드 미사용). 원격 head(`20260613`) 와 내 마이그레이션 사이 순서를 막고 있어 dead 마이그레이션으로 판단해 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| credits.ts + callback route | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Migration apply | `db migrations up 20260617000000` | Passed (504 1회 후 재시도 성공) |
| RPC viral=35 | `db query` pg_get_functiondef LIKE 체크 | `viral_35 = true` |
| grant_free_credit 존재 | `db query` pg_proc count | `grant_fn = 1` |
| Production deploy | `vercel --prod` | `READY` (https://la-musica.vercel.app, dpl_F3duTnPvqynFWRTCbZyxeqZvZZRj) |

## Lessons
- 크레딧 수가 두 곳에 산다: `lib/credits.ts`(앱/UI) **와** `fulfill_polar_credit_order` RPC(DB 검증 가드). 한쪽만 바꾸면 `credit_plan_mismatch` 로 결제 충전이 조용히 실패하므로 항상 동반 수정.
- Free 무료 지급은 "행 없을 때 1 삽입 + ON CONFLICT DO NOTHING" 으로 멱등 보장 → 매 로그인 호출해도 안전, 별도 grant-flag 컬럼 불필요. 행 삭제는 유저 권한 밖이라 재지급 악용 불가.
- Vercel **Git 자동배포 꺼짐** — 푸시만으로 배포 안 됨. 배포는 `npx vercel --prod --yes` 수동 필요.
- 미적용 로컬 마이그레이션(Stripe)이 원격 head 와 신규 마이그레이션 사이를 막음 → 순차 적용 전 dead 마이그레이션 확인·제거 필요.
