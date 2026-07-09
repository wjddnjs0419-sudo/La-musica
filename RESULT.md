# RESULT: 신규 가입 무료 크레딧 미지급 버그 진단·수정 - 2026-07-10

## Background
- Report: "우리 현재 구글로 로그인하면 자동으로 크레딧 지급되게 되어있나?" → 코드상 `app/api/auth/callback/route.ts`가 로그인마다 `grant_free_credit` RPC를 호출하도록 되어 있음을 확인.
- 이어서 사용자가 "오늘 내 친구들이 로그인 처음 했을때 자동 지급되지 않았어"라고 실제 버그를 보고 → `insforge-debug` 스킬로 실측 진단.
- InsForge `insforge.logs`/`postgREST.logs`를 07-08 19:09~07-09 17:52 구간(친구 2명의 실제 로그인 시각 포함, 다른 유저 로그인 다수 포함)에서 조회한 결과 **`grant_free_credit` RPC 호출이 단 한 건도 없음**을 확인 — 친구 2명만의 문제가 아니라 프로덕션에서 자동 지급이 전면적으로 작동하지 않고 있었음. 친구 2명이 현재 보유한 크레딧(14, 19)은 `payments` 원장에 기록이 없고 `POST /rawsql` 호출 직후 값이 찍힌 것으로 보아 자동 지급이 아닌 수동 SQL 개입으로 추정.
- 코드 검사 결과, `@insforge/sdk`의 `database.rpc()`는 Supabase postgrest-js 기반이라 실패해도 throw하지 않고 `{ data, error }`를 반환하는데, 기존 콜백 코드는 반환값을 전혀 확인하지 않고 버렸음 — RPC가 실패해도 `catch`도 `console.error`도 절대 발동하지 않는 구조. Vercel 함수 로그 보존 기간이 짧아 실제 사건 발생 시점(07-09 16:01~16:02 UTC)의 예외 메시지는 확보하지 못함(원인 100% 확정은 아님, 재발 시 진단 가능하도록 개선).

## Implementation
- **`lib/grantFreeCredit.ts`**(신규): `grantFreeCreditSafely(admin, userId)` — RPC 호출 후 `{ error }`를 명시적으로 체크해 실패 시 반드시 `console.error`로 로그, 예외 발생 시에도 캐치해 로그 후 `{ granted: false }` 반환(로그인 흐름은 절대 막지 않음). 성공 시 `data.status === "granted"` 여부로 실제 신규 지급 여부 판별.
- **`app/api/auth/callback/route.ts`**: 기존 `await admin.database.rpc("grant_free_credit", ...)` 무시 호출을 `await grantFreeCreditSafely(admin, userId)`로 교체.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `grantFreeCreditSafely` 성공/스킵/에러/예외 4케이스 | `vitest lib/grantFreeCredit.test.ts` RED→GREEN | Passed (4 new) |
| 콜백 라우트 타입 정합성(`PromiseLike` 반환 타입 정정) | `npm run build`(TypeScript) | Passed |
| Full suite | `npx vitest run` | 70 passed (11 files) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| 실제 프로덕션 재현(로그인 → InsForge 로그에서 grant_free_credit 재확인) | 미실행 — 이 환경에 브라우저/OAuth 자동화 불가 | **배포 후 사용자 확인 필요** |
| Vercel 프로덕션 env(`INSFORGE_API_KEY`/`INSFORGE_URL`) 실값 검증 | `vercel env pull`은 CLI 권한상 값이 항상 빈 문자열로 마스킹되어 실패 | **미확인 — 필요시 Vercel 대시보드에서 직접 확인 필요** |

## Lessons
- Supabase 계열 postgrest-js 기반 SDK의 `.rpc()`/`.from()`는 실패해도 throw하지 않고 `{ data, error }`를 반환한다 — `await`만 하고 반환값을 버리면 실패가 코드상 완전히 무음 처리된다. RPC/쿼리 빌더 호출은 항상 `{ data, error }`를 구조분해해 `error`를 확인해야 함.
- 실패가 무음 처리되는 코드는 "에러 로그가 없다"는 사실만으로는 무죄를 증명할 수 없다 — 서버(InsForge) 요청 로그에 호출 자체가 아예 안 잡히는지까지 함께 봐야 "실패했다" vs "시도조차 안 했다"를 구분할 수 있었음.
- Vercel 함수 런타임 로그는 보존 기간이 짧아(이번 세션에서 `--since`로 어제 시각을 요청해도 최근 ~1분치만 반환됨) 사후 정확한 예외 메시지 확보가 불가능할 수 있다 — 이번처럼 콘솔 로그에만 의존하는 에러 처리는 사후 진단이 어려우므로, 중요한 실패는 DB 등 영속 저장소에 남기는 편이 낫다(이번엔 범위 밖으로 남김).
- `vercel env pull`은 이 세션의 인증/권한 범위에서는 민감 변수 값을 전부 빈 문자열로 반환했다 — 값 존재 자체(`env ls`)는 확인 가능해도 실제 값 검증에는 못 씀. 프로덕션 env 실값 확인이 필요하면 Vercel 대시보드 직접 접근이 필요.

## Follow-ups (미적용)
- **가장 유력한 근본 원인 미확정**: `createInsforgeAdminClient()`가 프로덕션에서 조용히 throw하고 있을 가능성이 높음(RPC 요청 자체가 InsForge에 전혀 안 잡히는 것과 부합) — `INSFORGE_API_KEY`/`INSFORGE_URL`이 실제 프로덕션 런타임에 올바르게 주입되는지 Vercel 대시보드에서 직접 확인 필요.
- 실패를 콘솔 로그가 아닌 영속 저장소(예: 간단한 `app_errors` 테이블)에 남기는 개선은 범위 밖으로 미룸 — 이번 수정은 "에러가 최소한 로그에는 찍히게" 하는 데까지만 함.
- 배포 후 실제 구글 로그인 1회로 재현 확인 필요(브라우저 자동화 불가로 이번 세션에서 미실행).
