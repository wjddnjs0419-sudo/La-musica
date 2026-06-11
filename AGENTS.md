<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **La Musica** (API base `https://e99zrxhb.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

<!-- BEGIN:la-musica-workflow -->
## Claude Startup
- 매 세션 시작: `CLAUDE.md` 의 Bootstrap Sequence 수행 (`grep -nE "^##|^###" PLAN.md RESULT.md` → 활성 작업·최신 결과 파악).
- `ㅎㅇ` = 부트스트랩 명령(인사 아님). 즉시 컨텍스트 요약으로 첫 응답 시작.

## Mandatory Workflow
1. **Plan Before Code** — 계획 제시 → 승인 후 편집.
2. **작업 추적** — 진행 중 작업은 `PLAN.md` `## In Progress` 에 기록.
3. **완료 기록** — 완료 시 `RESULT.md` 작성(배경/구현/Verification Matrix/교훈), `PLAN.md` `## Done` 에 `[Done]` 한 줄 축약. `RESULT.md` 는 **최신 1건만** 유지하고 이전 건은 `RESULT_ARCHIVE.md` 상단에 append.
4. **Validate** — 변경 후 `npm run build` + `npm run lint` 통과 확인. (테스트 러너 미설치 — 빌드·린트가 게이트.)
5. `PLAN.md` `## Done` 10개 초과 시 오래된 것부터 삭제.

## Commands
- `npm run dev` — 개발 서버 (http://localhost:3000)
- `npm run build` — 프로덕션 빌드 + 타입체크
- `npm run lint` — eslint
- `npx @insforge/cli storage buckets` — 스토리지 버킷 목록
- `npx @insforge/cli secrets get <KEY>` — 백엔드 시크릿 조회
- InsForge 백엔드(마이그레이션/RLS/함수/배포)는 `insforge-cli` 스킬 사용.

## Architecture (요약)
- **Next.js 16** (App Router, Turbopack) + React 19. 라우트 핸들러는 `app/api/.../route.ts`, 동적 파라미터는 `await ctx.params`.
- **인증**: `@insforge/sdk/ssr` — 서버는 `createServerClient({ cookies })`, 클라는 `createBrowserClient()`. 리프레시는 `/api/auth/refresh`, 세션 갱신은 `proxy.ts`.
- **음악 생성**: 프롬프트 → `POST /api/music/generate`(Replicate musicgen 예측 시작 + `musics` 행 `processing` insert) → 클라가 `GET /api/music/[id]` 폴링 → 완료 시 mp3 를 `musics` 버킷에 복사하고 행 finalize. 공유 헬퍼·타입은 `lib/music.ts`.
- **DB**: `musics` 테이블(RLS: 소유자 또는 public 읽기). 마이그레이션은 `migrations/`.
<!-- END:la-musica-workflow -->
