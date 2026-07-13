# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Lyrics sync 2차 리뷰 P0 5건 수정 (2026-07-13) — `LA_MUSICA_LYRICS_SYNC_REVIEW.md` 기준 TDD 수정: `findActiveLineIndex` 기본값 -1, `buildLrcFromTimedMatches` line_index 기준 정렬+단조 증가 검증, coverage ratio(0.85) 미만 시 실패 처리, Gemini 파일 ACTIVE 상태 polling(`pollGeminiFileUntilActive`), 가사 싱크 전용 클라이언트 폴링 시작 시각 분리(`resolveLyricsPollStart`). 158 tests/typecheck/build/lint 통과. See RESULT.md.
- [Done] 앨범 커버 미반영 버그 수정 (2026-07-13) — 썸네일 백그라운드 생성이 `after()` 없이 fire-and-forget으로 실행돼 서버리스 함수 종료 시 `thumbnail_status`가 `pending`에 영구 고착되는 버그 발견/수정. `lib/image/ensureThumbnail.ts` 신규(가사 싱크와 동일한 `after()` 패턴), TDD 3 tests. 영향받은 1건 데이터 1회성 복구 완료. 144 tests/build/lint 통과. See RESULT_ARCHIVE.md.
- [Done] Synced-lyrics 배포 전 리뷰 findings 7건 수정 (2026-07-12) — code-review 스킬로 synced-lyrics 기능 전체 검토 후 7건 TDD 수정: 서버리스 background sync `after()` 적용, pending→syncing CAS 가드(cron/client 중복 Gemini 호출 방지), 두 라우트에 중복돼 있던 sync 오케스트레이션을 `lib/lyrics/ensureLyricsSync.ts`로 통합, 클라이언트 무한 폴링 cutoff, 소괄호 가사 삭제 버그 수정, 기존 카탈로그 20곡 백필 마이그레이션. 141 tests/build/lint 통과. See RESULT_ARCHIVE.md.
- [Done] Auto-generate LRC after audio completion Phase 2 (2026-07-11) — completed mp3 기준 Gemini audio alignment로 `metadata.lyrics_lrc` 자동 생성. `lyrics_sync_status`(`pending`/`syncing`/`synced`/`failed`/`skipped`) 저장, user/auto lyrics 공통 처리, workspace polling 및 cron reconcile 경로까지 sync 종료 반영. 관련 단위 테스트/lint/build 통과.
- [Done] LRC parser + unified timed playback fallback Phase 1 (2026-07-11) — `metadata.lyrics_lrc` 및 `lyrics_payload`/`lyrics` 내 LRC timestamp를 우선 파싱해 user/auto lyrics 모두 동일한 `LyricLine[]` 경로 사용. LRC 없으면 저장 없이 기존 approximate timestamp를 런타임 계산. 실제 자동 LRC 생성은 Phase 2로 남김. 관련 단위 테스트 통과.
- [Done] Workspace fast entry auth deblocking (2026-07-11) — `/workspace` 서버 auth/proxy session 대기 제거로 정적 shell 즉시 렌더, bootstrap에서 user/tracks/credit 후속 로드, OAuth callback 중복 auth 조회 제거, `musics(user_id, created_at DESC)` 마이그레이션 추가 및 DB 적용 완료. lint/build 통과. See RESULT.md.
- [Done] Lyrics formatting stabilization (2026-07-11) — 공통 가사 정규화 추가, 플레이어 `lyrics_payload` 우선 사용, 괄호형 instrumental/stage direction 제거, AI Lyrics Assistant prompt 강화. 관련 단위 테스트/build/lint 통과.
- [Done] MP3 메타데이터·플레이어 UX 3건 (2026-07-10) — ID3 태그 삽입 다운로드 API(제목+앨범아트, thumbnail fallback), 모바일 프로그레스바 시간 레이블 정렬 수정, 드롭다운 click-outside 핸들러 추가. build/lint 통과.
- [Done] Music Player 버그 수정 5개 (2026-07-10) — 모바일 여백, Prev/Next, 가사 누락(bootstrap metadata 복구), 하이라이트 동기화, 앨범 커버 즉시 반영(썸네일 폴링 연장). 107 tests/lint/build 통과.
- [Done] Workspace UX Renewal Phase 1+2 (2026-07-10) — music-workspace.tsx monolith 분해, GenerationProgressScreen/FailureDialog/FullScreenPlayer 신규, 가사 active-line 하이라이트, 모바일 볼륨 숨김, StatusBadge 제거, refund_status metadata 기록. build/lint 통과.
## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
