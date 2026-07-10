# RESULT: Workspace 스켈레톤 로딩 전환 - 2026-07-10

## Background
- 사용자가 `Open Workspace` 클릭 시 여전히 약 1초가 걸린다고 보고. 배포된 `/workspace`는 비로그인 기준으로도 300~570ms였고, 로그인 상태에서는 서버 인증 확인 뒤 `musics` 50개와 `user_credits` 조회까지 기다린 뒤 HTML/RSC를 내려주는 구조였음.
- Next 16 streaming 문서 확인: `loading.tsx`는 즉시 스켈레톤을 제공하지만, 실제 체감 개선을 위해서는 느린 데이터 접근을 route shell 밖이나 아래 경계로 밀어야 함. 이번 변경은 `/workspace` 서버 렌더에서 사용자 데이터 DB 조회를 제거하고, shell 이후 클라이언트 bootstrap 요청으로 분리.
- 사용자가 "컴포넌트를 하위 컴포넌트로 쪼개면 빨라지나"도 질문. 결론: 단순 파일 분리는 같은 import graph면 초기 번들 감소가 거의 없고, `next/dynamic`/lazy import로 비초기 UI(`CreditModal`, Lyrics Assistant 등)를 뒤로 미룰 때만 초기 로드 개선이 큼.

## Implementation
- **`app/workspace/page.tsx`**: 서버 렌더에서 음악 목록/크레딧 DB 조회 제거. 이제 `getCurrentUser()`로 navbar에 필요한 사용자 표시 정보와 `loadInitialData` 여부만 결정하고 바로 `WorkspaceShell`을 렌더.
- **`app/api/workspace/bootstrap/route.ts`**(신규): 로그인 사용자의 최근 음악 50개와 크레딧을 no-store JSON으로 반환. `musics`는 `select()` 전체 대신 UI에 필요한 컬럼만 명시하고 `metadata`는 빈 객체로 채워 payload를 줄임.
- **`components/workspace-shell.tsx`**: `loadInitialData` prop을 `MusicWorkspace`로 전달.
- **`components/music-workspace.tsx`**: `loadInitialData`가 true면 mount 후 `/api/workspace/bootstrap`을 호출해 tracks/credit을 채움. 로딩 중에는 리스트 영역에 `TrackListSkeleton`을 표시하고, 완료 후 기존 empty/search/result UI로 전환.
- **`app/workspace/loading.tsx`**(신규): route-level 즉시 스켈레톤 추가. navbar/search/avatar/list/prompt composer 자리의 shape를 실제 workspace와 비슷하게 맞춤.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Route table | `npm run build` | `/workspace` dynamic 유지, 신규 `/api/workspace/bootstrap` dynamic |
| Local production shell timing | `npm run start` 후 `/workspace` fetch 5회 | 134ms → 13ms → 9ms → 6ms → 5ms |
| Bootstrap unauthorized path | `npm run start` 후 `/api/workspace/bootstrap` 비로그인 fetch | 401, 5ms → 1ms |
| Data freshness | 코드 확인 | 사용자별 tracks/credit은 no-store bootstrap API에서 최신 조회 |

## Lessons
- 스켈레톤 자체보다 더 중요한 것은 "무엇을 기다리지 않게 만들었는가"다. 이번에는 목록/크레딧 DB 조회를 shell 이후로 밀어 첫 화면을 빠르게 했다.
- 단순 컴포넌트 분리는 성능 최적화가 아니다. 같은 route에서 정적 import되면 같은 클라이언트 번들에 들어가므로, 실제 초기 JS 감소는 lazy/dynamic import가 필요하다.
- `select()` 전체 조회는 편하지만 초기 workspace payload를 키울 수 있다. UI에 필요한 컬럼만 선택하고 metadata를 제외해 bootstrap 응답을 가볍게 유지했다.

## Follow-ups (미적용)
- 실제 로그인 세션으로 브라우저에서 `Open Workspace` 클릭 → 스켈레톤 → 목록 채움 흐름을 확인 필요.
- 다음 성능 후보: `CreditModal`, Lyrics Assistant, 일부 고급 prompt UI를 `next/dynamic`으로 lazy load해 초기 workspace JS를 더 줄이기.
