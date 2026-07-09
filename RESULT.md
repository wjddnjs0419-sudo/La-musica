# RESULT: 신규 가입 무료 크레딧 1개 → 5개 인상 - 2026-07-10

## Background
- 위 버그 수정 배포 후 실제 재현 테스트: 문제의 계정(`wjddnjs0419@hufs.ac.kr`, 크레딧/음악/결제 이력 없는 테스트 계정)을 `auth.user_providers`+`auth.users`에서 직접 삭제 후 재로그인 → **정상적으로 크레딧 지급 확인**. 즉 직전 수정으로 실제 문제 해결됨(근본 원인이 admin 클라이언트 쪽이었는지, 단순히 `{error}` 무시 케이스였는지는 여전히 미확정이지만 현재는 정상 동작).
- 사용자 질문: "모델 변경했으니 크레딧 몇 개 줘도 될까?" → Replicate API로 이 프로젝트의 실제 프로덕션 prediction 기록을 직접 조회해 원가 비교:
  - MiniMax music-2.6(구): $0.15 flat/output (Replicate 모델 페이지 표기)
  - ACE-Step 1.5(신): $0.000975/sec × GPU 시간(Nvidia L40S), 실제 프로덕션 180초 트랙 8건 평균 predict_time ~33초 → **곡당 ~$0.032**
  - 곡당 원가가 약 4.7배 저렴해짐 → 사용자가 "5개로 가자" 결정(5개 지급 원가 ~$0.16으로 기존 MiniMax 1개 지급 원가와 비슷한 수준).

## Implementation
- **`migrations/20260709181934_increase-free-signup-credit.sql`**(신규): `grant_free_credit` 함수를 `CREATE OR REPLACE`로 재정의, `INSERT ... VALUES (p_user_id, 1)` → `VALUES (p_user_id, 5)`. 기존 멱등 로직(`ON CONFLICT (user_id) DO NOTHING`)·권한(`project_admin`만 EXECUTE)은 그대로 유지.
- **`app/api/auth/callback/route.ts`**: 주석의 "(1 song)" → "(5 songs)"로 갱신(동작 코드는 변경 없음, `grantFreeCreditSafely` 그대로 사용).
- **`docs/credit-coupons.md`**: "grants one free credit on signup" → "grants five free credits on signup"로 갱신.
- **범위 밖**: 쿠폰(`redeem_credit_coupon`) 지급량은 이번 변경과 무관, 그대로 둠. `components/credit-modal.tsx`의 쿠폰 성공 메시지는 서버가 반환하는 실제 `creditsGranted` 값으로 이미 동적 처리되어 있어 수정 불필요.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| ACE-Step 실제 원가 산정 | Replicate `/v1/predictions` API로 이 계정의 실제 최근 24시간 `duration=180` 실행 8건 predict_time 조회 | 평균 ~33초 → ~$0.032/곡 |
| 마이그레이션 적용 후 함수 본문 확인 | `db query "SELECT prosrc FROM pg_proc WHERE proname='grant_free_credit'"` | `VALUES (p_user_id, 5)` 확인 |
| Full suite | `npx vitest run` | 70 passed (11 files, 회귀 없음) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| 실제 재로그인으로 크레딧 지급 재현 확인 | 테스트 계정 삭제 → 재로그인 | 지급 정상 확인(사용자 보고) — 단, 이 계정 삭제/재로그인은 "1개" 지급 시절 수정 검증이었고, 5개 반영 후 재확인은 아직 미실행 |

## Lessons
- 모델 교체처럼 원가 구조가 바뀌는 변경은 관련 정책 상수(무료 크레딧 개수 등)도 함께 재검토 대상이 된다 — 원가 절감분을 그대로 남겨두면 (의도치 않게) 과도하게 보수적인 정책이 남을 수 있음.

## Follow-ups (미적용)
- 5개 지급 반영 후 실제 재로그인 재현 테스트는 미실행(배포 직후라 확인 필요).
- 콘솔 로그가 아닌 영속 저장소에 실패를 남기는 개선(위 이슈에서 이월)은 계속 범위 밖.
