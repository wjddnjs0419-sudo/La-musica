# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] 모달 기반 Google 인증 전환 (2026-08-10) — 랜딩/가격/보호 워크스페이스 흐름의 `/auth` 이탈을 모달로 통일하고, OAuth returnTo 복원·Create Song 자동 오픈·기존 세션/Google 처리 보존. 5 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] 메인페이지 리뉴얼 디자인 명세 갱신 (2026-08-10) — Hero의 녹음실 배경, 가사→생성→완성 트랙 3단계 인터랙티브 데모, 단계 선택·실제 데모 오디오 재생·모션/접근성 규칙을 구현과 일치하도록 문서화. build/lint 통과. See RESULT.md.
- [Done] 메인페이지 UI 리뉴얼 (2026-08-08) — 다크 에디토리얼 랜딩으로 Hero·실제 샘플 4곡·How It Works·실제 옵션 기반 Product proof·가격·CTA·Footer를 재구성. `/auth`→`/workspace`, `CREDIT_PLANS`, checkout, 단일 샘플 재생은 보존. 1440px/390px 반응형 구성, build 통과·lint 오류 0개. See RESULT.md.
- [Done] 제목 기반 앨범 커버 prediction 병렬화 (2026-07-13) — 신용 예약 직후 제목만으로 Replicate cover prediction을 시작하고 ID를 곡 metadata에 저장. 워크스페이스 3초 폴링이 오디오·커버 prediction을 각각 조회/완료 처리하도록 전환해 `after()` 장시간 실행 의존 제거. 실패 원인(`thumbnail_error`) 저장, 커버 성공 시 InsForge Storage URL/key 반영. 129 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] Gemini 오디오 가사 싱크 기능 삭제 (2026-07-13) — MVP 오버스펙 판단으로 Gemini 기반 정밀 가사 하이라이트 파이프라인 전체 제거: `lib/lyrics/sync.ts`/`ensureLyricsSync.ts` 삭제, 3개 라우트(generate/[id]/reconcile-music)에서 호출 제거, `WorkspaceShell.tsx` 가사 폴링 로직 제거, `LyricsSyncStatus` 타입 제거, 기존 49개 곡의 `lyrics_sync_*`/`lyrics_lrc` metadata 정리 마이그레이션 적용(가사 텍스트는 미변경). API 호출 없는 approximate 균등분배 하이라이트(`lib/player/lyrics.ts`)는 유지. 126 tests/typecheck/build/lint 통과. See RESULT.md.
- [Done] Lyrics sync 2차 리뷰 P0 5건 수정 (2026-07-13) — `LA_MUSICA_LYRICS_SYNC_REVIEW.md` 기준 TDD 수정: `findActiveLineIndex` 기본값 -1, `buildLrcFromTimedMatches` line_index 기준 정렬+단조 증가 검증, coverage ratio(0.85) 미만 시 실패 처리, Gemini 파일 ACTIVE 상태 polling(`pollGeminiFileUntilActive`), 가사 싱크 전용 클라이언트 폴링 시작 시각 분리(`resolveLyricsPollStart`). 158 tests/typecheck/build/lint 통과. (이후 세션에서 기능 자체가 삭제됨.) See RESULT_ARCHIVE.md.
- [Done] 앨범 커버 미반영 버그 수정 (2026-07-13) — 썸네일 백그라운드 생성이 `after()` 없이 fire-and-forget으로 실행돼 서버리스 함수 종료 시 `thumbnail_status`가 `pending`에 영구 고착되는 버그 발견/수정. `lib/image/ensureThumbnail.ts` 신규(가사 싱크와 동일한 `after()` 패턴), TDD 3 tests. 영향받은 1건 데이터 1회성 복구 완료. 144 tests/build/lint 통과. See RESULT_ARCHIVE.md.
- [Done] Synced-lyrics 배포 전 리뷰 findings 7건 수정 (2026-07-12) — code-review 스킬로 synced-lyrics 기능 전체 검토 후 7건 TDD 수정: 서버리스 background sync `after()` 적용, pending→syncing CAS 가드(cron/client 중복 Gemini 호출 방지), 두 라우트에 중복돼 있던 sync 오케스트레이션을 `lib/lyrics/ensureLyricsSync.ts`로 통합, 클라이언트 무한 폴링 cutoff, 소괄호 가사 삭제 버그 수정, 기존 카탈로그 20곡 백필 마이그레이션. 141 tests/build/lint 통과. (이후 세션에서 기능 자체가 삭제됨.) See RESULT_ARCHIVE.md.
- [Done] Auto-generate LRC after audio completion Phase 2 (2026-07-11) — completed mp3 기준 Gemini audio alignment로 `metadata.lyrics_lrc` 자동 생성. `lyrics_sync_status`(`pending`/`syncing`/`synced`/`failed`/`skipped`) 저장, user/auto lyrics 공통 처리, workspace polling 및 cron reconcile 경로까지 sync 종료 반영. 관련 단위 테스트/lint/build 통과. (이후 세션에서 기능 자체가 삭제됨.)
- [Done] LRC parser + unified timed playback fallback Phase 1 (2026-07-11) — `metadata.lyrics_lrc` 및 `lyrics_payload`/`lyrics` 내 LRC timestamp를 우선 파싱해 user/auto lyrics 모두 동일한 `LyricLine[]` 경로 사용. LRC 없으면 저장 없이 기존 approximate timestamp를 런타임 계산. 실제 자동 LRC 생성은 Phase 2로 남김. 관련 단위 테스트 통과.
- [Done] Workspace fast entry auth deblocking (2026-07-11) — `/workspace` 서버 auth/proxy session 대기 제거로 정적 shell 즉시 렌더, bootstrap에서 user/tracks/credit 후속 로드, OAuth callback 중복 auth 조회 제거, `musics(user_id, created_at DESC)` 마이그레이션 추가 및 DB 적용 완료. lint/build 통과. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
