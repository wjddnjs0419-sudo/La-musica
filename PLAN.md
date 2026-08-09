# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Workspace shell fidelity correction (2026-08-10) — 목표 시안 기준의 90px 헤더·Credits/프로필 메뉴·Library 검색/폭·Composer+Player 2단 바·Credits 모달을 실제 checkout·coupon·오디오·Create Song 로직 유지 상태로 재구성. 139 tests/build/lint 오류 0개 통과. See RESULT.md.
- [Done] Workspace Library + Music Player 리뉴얼 (2026-08-10) — 기존 `/workspace`의 실제 검색·곡 관리·오디오·생성 상태를 유지하며 행 기반 Library, 하단 고정 mini player, 앨범아트+가사 2열 전체화면 player 및 모바일 세로 player를 구현. 139 tests/build/lint 오류 0개 통과. See RESULT.md.
- [Done] Desktop Create Song 모달 레이아웃 교정 (2026-08-10) — 모달 높이를 단계와 무관하게 고정하고, 좌측 Lyrics/Sound/Create 버튼의 폭·높이를 균일화하며 우측 콘텐츠만 스크롤하도록 변경. build/lint/test 통과. See RESULT.md.
- [Done] Create Song Lyrics/Sound 프로토타입 상호작용 보완 (2026-08-10) — Step 1의 직접 작성/대화형 AI 작사 탭과 Step 2의 Simple/Advanced 모드를 복원하고, AI 가사 적용·실제 GenerateRequest 상태를 보존. build/lint/test 통과. See RESULT.md.
- [Done] Workspace Create Song 3단계 모달 + 생성 진행/완료 경험 리뉴얼 (2026-08-10) — 기존 `/workspace` 안에서 실제 API·크레딧·폴링·오디오 상태를 보존한 채 Lyrics→Sound→Create 모달, 모바일 가로/데스크톱 세로 단계, 영상 기반 진행·완료·환불 실패 상태를 구현. 단위 테스트/build/lint 통과. See RESULT.md.
- [Done] 모달 기반 Google 인증 전환 (2026-08-10) — 랜딩/가격/보호 워크스페이스 흐름의 `/auth` 이탈을 모달로 통일하고, OAuth returnTo 복원·Create Song 자동 오픈·기존 세션/Google 처리 보존. 5 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] 메인페이지 리뉴얼 디자인 명세 갱신 (2026-08-10) — Hero의 녹음실 배경, 가사→생성→완성 트랙 3단계 인터랙티브 데모, 단계 선택·실제 데모 오디오 재생·모션/접근성 규칙을 구현과 일치하도록 문서화. build/lint 통과. See RESULT.md.
- [Done] 메인페이지 UI 리뉴얼 (2026-08-08) — 다크 에디토리얼 랜딩으로 Hero·실제 샘플 4곡·How It Works·실제 옵션 기반 Product proof·가격·CTA·Footer를 재구성. `/auth`→`/workspace`, `CREDIT_PLANS`, checkout, 단일 샘플 재생은 보존. 1440px/390px 반응형 구성, build 통과·lint 오류 0개. See RESULT.md.
- [Done] 제목 기반 앨범 커버 prediction 병렬화 (2026-07-13) — 신용 예약 직후 제목만으로 Replicate cover prediction을 시작하고 ID를 곡 metadata에 저장. 워크스페이스 3초 폴링이 오디오·커버 prediction을 각각 조회/완료 처리하도록 전환해 `after()` 장시간 실행 의존 제거. 실패 원인(`thumbnail_error`) 저장, 커버 성공 시 InsForge Storage URL/key 반영. 129 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] Gemini 오디오 가사 싱크 기능 삭제 (2026-07-13) — MVP 오버스펙 판단으로 Gemini 기반 정밀 가사 하이라이트 파이프라인 전체 제거: `lib/lyrics/sync.ts`/`ensureLyricsSync.ts` 삭제, 3개 라우트(generate/[id]/reconcile-music)에서 호출 제거, `WorkspaceShell.tsx` 가사 폴링 로직 제거, `LyricsSyncStatus` 타입 제거, 기존 49개 곡의 `lyrics_sync_*`/`lyrics_lrc` metadata 정리 마이그레이션 적용(가사 텍스트는 미변경). API 호출 없는 approximate 균등분배 하이라이트(`lib/player/lyrics.ts`)는 유지. 126 tests/typecheck/build/lint 통과. See RESULT.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
