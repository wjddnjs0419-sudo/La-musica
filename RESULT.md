# RESULT: Vercel Cron 연결 + DB 마이그레이션 적용 + Phase 5 - 2026-07-10

## Background
Phase 0~4 완료 후 남은 Follow-up 3개 처리: Vercel Cron 연결, `generation_cost_logs` DB 실제 적용, Phase 5(Short-form duration + 프리셋).

## Implementation

### Vercel Cron 연결
- `vercel.json` 신규: `*/5 * * * *` 스케줄로 `POST /api/internal/reconcile-music` 호출
- `app/api/internal/reconcile-music/route.ts`:
  - 인증 방식 수정: Vercel Cron이 보내는 `Authorization: Bearer <CRON_SECRET>` + 기존 `x-cron-secret` 둘 다 허용
  - `CRON_SECRET`는 Vercel 시스템 변수(자동 주입) — 수동 등록 불필요

### generation_cost_logs DB 적용
- `npx @insforge/cli db import migrations/20260710000000_generation-cost-logs.sql` 실행 → 실제 InsForge DB에 테이블·인덱스 생성 완료

### Phase 5 — Duration 옵션 + 프리셋
- `lib/music.ts`:
  - `GenerateRequest`에 `duration?: number` 필드 추가
  - `buildAceStepInput()`에 `duration` 파라미터 추가 (기본값 `ACE_STEP_DURATION_SECONDS`)
- `lib/music.test.ts`: duration 관련 테스트 2개 추가 (RED→GREEN 확인), 설명 "fixed" → "default" 수정
- `app/api/music/generate/route.ts`:
  - `duration` 파싱 추가 (상한 300s 클램프)
  - `buildAceStepInput()` 호출에 `duration` 전달
  - 비용 로그 `durationSeconds`를 실제 `duration ?? ACE_STEP_DURATION_SECONDS`로 수정
- `components/prompt-box.tsx`:
  - `Preset` 타입 `duration?: 60 | 180` 리터럴 유니온 (안전한 타입)
  - `PRESETS` 배열: Football Chant / Meme (60s) / Sports Hype 3개
  - Duration 토글 UI: Short (1 min) / Full (3 min)
  - Quick presets 버튼 행 (클릭 시 관련 옵션 전체 교체)
  - `handleSubmit`에 `duration` 포함, reset 시 180으로 초기화

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 테스트 | `npx vitest run` | 95 tests passed (15 suites) |
| 타입체크/빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors) |
| 코드 리뷰 | Phase 5 서브에이전트 리뷰 | Important 3개 + Minor 수정 완료 |

## Lessons
- Vercel `CRON_SECRET`는 시스템 변수라 Vercel UI에서 수동 등록이 막힘 — 배포하면 자동 주입됨.
- InsForge MCP는 Supabase project ref 형식(20자 소문자)만 수락 — InsForge 프로젝트엔 `@insforge/cli db import` 사용.

## Follow-ups (미적용)
- Polar Viral Pack product ID도 50 credits 기준으로 동기화 필요 (백엔드 Polar 대시보드 — 사용자 수동)
