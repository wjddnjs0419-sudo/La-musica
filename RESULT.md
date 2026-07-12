# RESULT: Synced-lyrics 기능 배포 전 리뷰 findings 7건 수정 - 2026-07-12

## Background
"synced lyrics 배포 전 테스트"를 요청받아 `code-review` 스킬(고효율, 5개 finder 에이전트 병렬)로 아직 커밋되지 않은 synced-lyrics 기능(LRC 파싱 + Gemini 오디오 정렬 백그라운드 sync 파이프라인) 전체를 검토했다. 정확성 findings 7건이 나왔고, 그중 4건(#1/#2/#4/#5)은 배포 시 기능이 아예 동작하지 않거나(서버리스 종료로 백그라운드 작업 소실) 비용이 새는(동시성 가드 부재로 Gemini 중복 호출, 배포 시 기존 카탈로그 소급 트리거) 심각도였다. 사용자 승인 하에 7건 전부를 TDD로 수정했다.

## Implementation

### Fix #7 — finalize UPDATE 이중쓰기 가드
`app/api/music/[id]/route.ts`의 `processing → completed` UPDATE에 `.eq("status", "processing")` 가드 추가 (reconcile-music의 `markCompleted`와 동일 패턴). 중복 finalize 요청이 lyrics-sync 상태를 되돌리는 경로를 차단.

### Fix #6 — stage-direction 정규식이 실제 가사를 지우는 문제
`lib/lyrics/format.ts`를 두 갈래로 분리했다: `sanitizeLyricsForModel`(음악 생성 모델 페이로드용, `buildLyricsPayload.ts`가 사용)은 소괄호 stage-direction 스트리핑을 그대로 유지 — 생성 모델에게 instrumental gap을 알려주는 정당한 용도라 회귀시키지 않았다. `lyricDisplayLines`(플레이어 표시 + Gemini 정렬 ground truth, `lib/player/lyrics.ts`/`lib/lyrics/sync.ts`가 사용)는 소괄호를 절대 건드리지 않도록 바꾸고, 대괄호도 인식된 태그/방향 지시일 때만 제거하도록(무조건 leading bracket 제거하던 버그 포함) 좁혔다. `lib/lyrics/format.test.ts` 신규 + 기존 `lyrics.test.ts`/`buildLyricsPayload.test.ts` 기대값 갱신.

### Fix #5 + #4 + #1 — 공유 오케스트레이션 모듈 + CAS 가드 + `after()`
`lib/lyrics/ensureLyricsSync.ts`를 신규로 만들어 두 라우트(`app/api/internal/reconcile-music/route.ts`, `app/api/music/[id]/route.ts`)에 ~110줄씩 복붙돼 있던 `ensureLyricsSyncStarted`/`syncLyricsInBackground`/`updateMusicMetadata`를 하나로 통합했다.
- `pending → syncing` 전환은 `.eq("metadata->>lyrics_sync_status", observedStatus)`(명시값 없으면 `.is("metadata->lyrics_sync_status", null)`) CAS 가드로 감싸, 두 트리거(cron + 클라이언트 poll)가 동시에 관측해도 하나만 실제로 sync를 시작하게 했다. 가드가 안 맞으면(이미 다른 프로세스가 선점) 아무 것도 하지 않고 반환.
- `syncing`으로 3분 넘게 멈춰 있으면(백그라운드 작업이 죽은 것으로 간주) 같은 CAS로 재시도를 허용 — "stuck" 복구 경로.
- 최종 synced/failed/skipped 기록도 `.eq("metadata->>lyrics_sync_status", "syncing")` 가드를 걸어, 뒤늦게 끝난 중복 실행이 이미 확정된 결과를 덮어쓰지 못하게 했다.
- 실제 오디오 업로드+정렬(`syncLyricsInBackground`)은 `next/server`의 `after()`로 감싸 응답 반환 후에도 실행이 보장되도록 하고, 두 라우트에 `export const maxDuration = 90` 추가. CAS 쓰기 자체는 빠르므로 두 라우트 모두 `await ensureLyricsSyncStarted(...)`로 통일(이전엔 reconcile 쪽만 fire-and-forget).
- `lib/lyrics/ensureLyricsSync.test.ts` 신규(9 tests): CAS 성공/충돌/stale 재시도/IS NULL 가드/synced·skipped·failed 결과 기록을 admin 클라이언트 mock으로 검증.

### Fix #2 — 클라이언트 무한 폴링 방지 + 죽은 파일 제거
`lib/lyrics/sync.ts`에 순수 함수 `shouldStopLyricsPolling(startedAtMs, nowMs, maxWaitMs = 2분)` 추가. `components/workspace/WorkspaceShell.tsx`의 `polling` ref를 `Set<string>`에서 `Map<string, number>`(폴링 시작 시각 기록)로 바꾸고, lyrics 폴링 지속 조건에 이 cutoff를 결합해 2분 넘도록 안 끝나면 lyrics 폴링만 중단한다(트랙 상태 폴링과 무관). 아무데서도 import되지 않던 죽은 컴포넌트 `components/music-workspace.tsx`(리팩터 이전 monolith, `git grep`으로 재확인 후) 삭제.

### Fix #3 — 기존 카탈로그 소급 백필 마이그레이션
`migrations/20260712112811_backfill-lyrics-sync-status-skipped.sql` 작성/적용. `status='completed'`이고 `metadata->>'lyrics_sync_status'`가 없는 행을 전부 `"skipped"`로 백필 — 신규 생성곡만 auto-sync 대상이 되도록 하고, 배포 직후 워크스페이스 첫 로드에서 기존 곡들이 무더기로 Gemini 호출을 트리거하는 걸 막았다. 적용 전 대상 카운트를 InsForge CLI로 확인(완료곡 47개 중 20개 대상), 적용 후 재확인해 0개로 백필 완료 확인.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 단위 테스트 | `npx vitest run` | Passed (19 files / 141 tests) |
| 타입체크 | `npx tsc --noEmit` | Passed |
| Build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors, 기존 `FullScreenPlayer` `<img>` warning 1개 유지) |
| 백필 마이그레이션 | InsForge CLI `db query` 전/후 카운트 | 20개 대상 → 0개 잔여 확인 |

## Lessons
- 리뷰에서 나온 findings를 순서 없이 바로 고치기보다, 의존관계(공유 모듈 추출이 CAS 가드·`after()` 적용을 한 곳에서만 고치게 해줌)를 먼저 따져 묶어서 처리하는 편이 총 작업량이 줄었다 — 7건이 실질적으로 5개 구현 단계로 수렴.
- 같은 `stripStageDirections` 로직을 "화면 표시"와 "생성 모델 페이로드" 두 군데가 공유하고 있었는데, 전자만 고쳐야 할 버그를 공유 함수에서 고치면 후자(정당한 동작)에 회귀가 생긴다 — 공유 코드를 고칠 땐 모든 소비자의 요구사항이 실제로 같은지 먼저 확인해야 한다.
- 마이그레이션 적용 전 `SELECT count(*)`로 실제 영향받는 행 수를 먼저 확인한 게 유효했다 — "47개 완료곡 중 20개가 소급 트리거 대상"이라는 구체적 숫자가 나오고 나서야 이 finding이 가설이 아니라 실제 문제였음이 확인됐다.
