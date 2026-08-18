# RESULT: Viral Pack 35곡 정책 정합성 복구 - 2026-08-18

## Background

배포된 DB 정산 함수는 Viral Pack 구매를 35크레딧으로 검증했지만, 앱의 플랜 정의·사용자 가격 표시·README는 50곡으로 남아 있었다. 이 상태에서는 checkout 메타데이터와 DB 검증값이 달라 결제 충전이 거부될 수 있었다.

## Implementation

- `lib/credits.ts`의 Viral Pack을 `$14.99 / 35 credits`로 변경해 가격 카드와 checkout 메타데이터를 DB 기준에 맞췄다.
- 약관과 README의 Viral Pack 표기를 35곡으로 수정하고, README 곡당 단가를 `$0.43`으로 정정했다.
- 35곡 기준에서 더는 성립하지 않는 “최저 곡당 단가” 가격 카드 문구와 단가 우위 테스트를 정책값 검증으로 교체했다.

## Verification

| Check | Result |
|---|---|
| `npm test` | 22 files, 141 tests passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## Lessons

- 결제 플랜 수량은 프론트엔드 노출, checkout 메타데이터, DB 정산 검증, 문서에서 단일 기준으로 유지해야 한다.
