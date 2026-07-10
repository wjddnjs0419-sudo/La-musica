# La Musica

프롬프트를 입력하면 AI가 음악을 생성해주는 웹 앱.

## 무엇

사용자가 워크스페이스에서 텍스트 프롬프트(예: "잔잔한 피아노 곡")를 입력하면, Replicate `fishaudio/ace-step-1.5` 모델이 음악을 생성하고, 생성된 mp3를 InsForge 스토리지에 저장한 뒤 브라우저에서 바로 재생할 수 있다. Gemini가 프롬프트 번역·스타일 정제·가사 생성을 담당하고, Polar로 크레딧을 결제한다.

## 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) + React 19 |
| 백엔드(BaaS) | [InsForge](https://insforge.dev) — Postgres DB · 인증 · 스토리지 |
| 음악 생성 | [Replicate](https://replicate.com) `fishaudio/ace-step-1.5` (ACE-Step, mp3) |
| AI 보조 | Gemini — 프롬프트 번역 · 스타일 정제 · 자동 가사 생성 |
| 결제 | [Polar](https://polar.sh) — 크레딧 팩 checkout |
| 스타일 | Tailwind CSS v4 |

## 크레딧 플랜

| 플랜 | 가격 | 크레딧 | 곡당 단가 |
|---|---:|---:|---:|
| Starter | $2.99 | 5곡 | $0.60 |
| Creator | $7.99 | 20곡 | $0.40 |
| Viral Pack | $14.99 | 50곡 | $0.30 |

신규 가입 시 무료 크레딧 5개 지급. 1 크레딧 = 1곡.

## 동작 흐름

```
프롬프트 입력 (workspace)
   │  POST /api/music/generate
   ▼
Gemini: 번역 → 스타일 정제 → (보컬곡 + 가사 없음이면) 자동 가사 생성
   │
ACE-Step 예측 시작(논블로킹) + musics 행 insert (status: processing)
   │  클라이언트가 3초 간격 폴링
   ▼  GET /api/music/[id]
예측 완료? → mp3를 musics 버킷에 복사 → 행 finalize (completed, audio_url/key)
   ▼
오디오 플레이어로 재생
```

비동기 + 폴링 방식. Replicate 출력 URL은 만료되므로 mp3를 InsForge 스토리지로 복사해 영구 보관한다.

## 구조

```
app/
  page.tsx              랜딩 (Header + Hero)
  auth/page.tsx         로그인/가입
  workspace/page.tsx    음악 생성 워크스페이스 (서버 컴포넌트)
  api/
    auth/...            InsForge SSR 인증 (callback/google/refresh/signout)
    music/generate      POST: 번역·정제·예측 시작 + processing 행 insert
    music/[id]          GET: 폴링 → mp3 스토리지 복사 → 행 finalize
    lyrics/chat         POST: Gemini 가사 어시스턴트
    polar/webhook       POST: 결제 완료 후 크레딧 지급
components/
  music-workspace.tsx   프롬프트 전송 + 폴링 + 트랙 카드/플레이어 (클라)
  prompt-box.tsx        입력 UI 셸 (onSend 콜백)
  workspace-navbar.tsx  워크스페이스 상단바
lib/
  music.ts              ACE-Step 상수/입력 빌더/Music 타입 (서버·클라 공유)
  credits.ts            크레딧 플랜 정의 (CREDIT_PLANS)
  music-prompt/         프롬프트 컴파일 파이프라인
  lyrics-assistant/     Gemini 가사 생성 로직
migrations/
  *_create-musics.sql   musics 테이블 + RLS + 인덱스
```

### `musics` 테이블

AI 생성 음악 레코드. 소유자(또는 `is_public`)만 읽기, 소유자만 쓰기 (RLS). 주요 컬럼: `status`(pending/processing/completed/failed), `audio_url`+`audio_key`(스토리지), `prompt`, `title`, `model`, `metadata`(prediction_id · lyrics_source · generated_lyrics 등).

## 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

### 환경 변수 (`.env.local`)

```bash
NEXT_PUBLIC_INSFORGE_URL=...        # InsForge API base
NEXT_PUBLIC_INSFORGE_ANON_KEY=...   # npx @insforge/cli secrets get ANON_KEY
REPLICATE_API_TOKEN=...             # https://replicate.com 계정 토큰
GEMINI_API_KEY=...                  # Google AI Studio API 키
POLAR_WEBHOOK_SECRET=...            # Polar 웹훅 서명 검증 키
POLAR_STARTER_PRODUCT_ID=...        # Polar Starter 플랜 product ID
POLAR_CREATOR_PRODUCT_ID=...        # Polar Creator 플랜 product ID
POLAR_VIRAL_PACK_PRODUCT_ID=...     # Polar Viral Pack 플랜 product ID
```

키는 `.env.local`(앱) / `.insforge/project.json`(CLI)에서 읽음. 하드코딩·커밋 금지.

### 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 + 타입체크 |
| `npm run lint` | eslint |
| `npm test` | vitest 테스트 실행 |
| `npx @insforge/cli storage buckets` | 스토리지 버킷 목록 |

## 문서 지도

| 파일 | 역할 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | AI 에이전트 라우터 — 세션 부트스트랩 시퀀스·단축어·핵심 규칙 |
| [AGENTS.md](AGENTS.md) | 프로젝트 규칙 — InsForge/Next 규약, 워크플로, 명령어, 아키텍처 |
| [PLAN.md](PLAN.md) | 활성/예정/완료 작업 추적 |
| [RESULT.md](RESULT.md) | 최신 작업의 구현·검증 기록 |
| [RESULT_ARCHIVE.md](RESULT_ARCHIVE.md) | 과거 세션 기록 누적 |
| [docs/ACE_STEP_PROMPT_ENGINEERING.md](docs/ACE_STEP_PROMPT_ENGINEERING.md) | ACE-Step 프롬프트 엔지니어링 가이드 |
