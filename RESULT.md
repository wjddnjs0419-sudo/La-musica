# RESULT: 랜딩 페이지 전환 성능 개선 - 2026-07-10

## Background
- 사용자가 페이지 이동이 매우 느리다고 보고. 로컬 측정 결과 `/`는 warm 상태에서도 약 180~200ms였고, 원인은 랜딩 페이지가 `cookies()`/`getCurrentUser()`와 InsForge 샘플 트랙 조회를 서버 렌더 경로에서 매번 기다리는 구조였음.
- Next 16 문서 확인: 페이지/레이아웃 상단에서 `cookies()`나 데이터 fetch를 `await`하면 아래 정적 shell 전체가 동적 렌더에 묶임. Turbopack root도 상위 `/Users/jeongwonkim`로 추정되는 경고가 있어 dev 첫 요청이 불필요하게 느려질 수 있었음.
- 사용자가 랜딩 정적화 시 새 노래 목록/생성 결과 신선도 문제를 우려. `/workspace`의 사용자별 음악 목록과 크레딧 조회는 그대로 동적 유지하고, 랜딩의 고정 featured 샘플만 1시간 ISR 캐시로 전환하기로 결정.
- 인라인 스타일 여부도 확인: 전체 UI는 Tailwind 클래스 기반이며, `style=` 직접 사용은 히어로 마스크/WebGL 최소 높이/Logo display/body scroll lock/textarea auto-height 같은 제한적 예외만 있음. 사이트 전체가 인라인 스타일 기반으로 제작된 것은 아님.

## Implementation
- **`app/page.tsx`**: 서버 인증 확인(`cookies()` + `getCurrentUser()`) 제거. 랜딩은 `revalidate = 3600`으로 1시간 ISR 정적 응답이 되도록 변경. CTA는 클라이언트에서 로그인 상태를 늦게 반영.
- **`components/auth-aware-get-started-badge.tsx`**(신규): 랜딩 CTA가 처음에는 `/auth`/`Get Started`로 렌더되고, hydration 후 `/api/auth/status`가 authenticated를 반환하면 `/workspace`/`Open Workspace`로 갱신. 모듈 단위 promise 캐시로 한 페이지의 여러 CTA가 같은 status 요청을 공유.
- **`app/api/auth/status/route.ts`**(신규): 쿠키 세션을 읽어 `{ authenticated }`만 반환하는 no-store route. 랜딩 HTML 렌더를 막지 않고 CTA 라벨만 사후 갱신.
- **`components/headersection.tsx`, `components/herosection.tsx`, `components/cta-section.tsx`**: `authAwareCta` 옵션 추가. 랜딩에서만 auth-aware CTA를 사용하고 다른 페이지의 기존 `ctaHref` 흐름은 유지.
- **`app/workspace/page.tsx`**: 로그인 후 `musics` 목록 조회와 `user_credits` 조회를 `Promise.all`로 병렬화. `/workspace` 자체는 계속 동적 서버 렌더.
- **`next.config.ts`**: `turbopack.root = process.cwd()` 설정으로 dev 서버의 상위 lockfile 기반 root 추정 경고 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 랜딩 정적화 여부 | `npm run build` route table | `/` = `○`, Revalidate `1h`; `/workspace` = `ƒ` dynamic 유지 |
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Dev root 경고 | `npm run dev` | Turbopack root warning 사라짐 |
| Production response timing | `npm run start` 후 Node fetch 3회 | `/` 99ms → 5ms → 5ms, `x-nextjs-cache=HIT`; `/api/auth/status` 7ms → 2ms → 1ms |
| Workspace freshness guard | build route table + 코드 확인 | `/workspace`는 정적화하지 않음, 사용자별 목록/크레딧은 동적 조회 유지 |
| 인라인 스타일 조사 | `rg -n "style=|\\.style\\.|<style"` | Tailwind 중심. 제한적 예외: body scroll lock, textarea auto-height, hero WebGL mask/minHeight, logo display block |

## Lessons
- “랜딩 정적화”와 “사용자 데이터 캐시”는 분리해야 한다. 이번에는 고정 featured 샘플만 ISR로 두고, `/workspace`는 계속 동적으로 남겨 사용자 생성 목록/크레딧 신선도를 보존했다.
- 로그인 상태에 따른 CTA 문구는 페이지 HTML을 막지 않아도 된다. 서버 렌더를 기다리는 대신, 클라이언트에서 사후 갱신하면 첫 화면 응답을 빠르게 유지할 수 있다.
- dev 모드 첫 요청 수치는 컴파일 영향을 크게 받는다. 실제 체감 판단에는 `next build` + `next start`에서 cache header와 반복 요청을 함께 확인하는 편이 더 정확하다.

## Follow-ups (미적용)
- 랜딩 footer의 `Create` 링크는 정적 `/auth`로 남아 있음. 로그인 사용자가 누르면 `/auth`에서 `/workspace`로 리다이렉트되므로 기능 문제는 없지만, footer까지 즉시 `/workspace`로 바꾸려면 auth-aware footer link 컴포넌트를 별도로 추가할 수 있음.
- `/api/auth/status` 첫 요청은 dev 모드에서 route compile 때문에 한 번 44s가 나왔으나, production에서는 1~7ms. 배포 후 실제 브라우저에서 CTA 라벨 전환 체감을 확인하면 좋음.
