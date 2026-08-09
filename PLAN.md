# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Workspace/Create Song 모바일 밀도 최적화 (2026-08-10) — 단계별 모달 크기 변동을 고정 프레임·내부 스크롤로 제거하고, workspace의 모바일 상단·목록·mini player 여백을 균형 있게 압축.

## Done
- [Done] CTA 모바일 배경 이미지 교체 (2026-08-10) — 제공된 1080×1350 세로 이미지를 모바일 CTA에 적용하고 데스크톱 배경은 유지. build/lint 오류 0개 통과. See RESULT.md.
- [Done] OG 공유 이미지 교체 (2026-08-10) — 제공된 La Musica 이미지로 `public/og-image.png`를 교체하고 OG 크기 메타데이터를 1731×909로 정합. build/lint 오류 0개 통과. See RESULT.md.
- [Done] 모바일 전체화면 플레이어 격리 (2026-08-10) — opaque player root로 workspace/mini player bleed를 차단하고, 모바일 artwork·metadata·lyrics·footer를 경계가 있는 영역으로 분리. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Privacy/Terms UI 리뉴얼 (2026-08-10) — shared LegalPage를 current La Musica near-black header·legal reading column으로 교체하고 Footer 없이 문서·metadata·링크를 보존. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Workspace shell fidelity correction (2026-08-10) — 목표 시안 기준의 90px 헤더·Credits/프로필 메뉴·Library 검색/폭·축소된 Credits 모달을 구현하고, 하단 Create Song 프롬프트는 제거하며 mini player는 기존 카드 구조로 유지. 실제 checkout·coupon·오디오·Create Song 로직 보존. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Workspace Library + Music Player 리뉴얼 (2026-08-10) — 기존 `/workspace`의 실제 검색·곡 관리·오디오·생성 상태를 유지하며 행 기반 Library, 하단 고정 mini player, 앨범아트+가사 2열 전체화면 player 및 모바일 세로 player를 구현. 139 tests/build/lint 오류 0개 통과. See RESULT.md.
- [Done] Desktop Create Song 모달 레이아웃 교정 (2026-08-10) — 모달 높이를 단계와 무관하게 고정하고, 좌측 Lyrics/Sound/Create 버튼의 폭·높이를 균일화하며 우측 콘텐츠만 스크롤하도록 변경. build/lint/test 통과. See RESULT.md.
- [Done] Create Song Lyrics/Sound 프로토타입 상호작용 보완 (2026-08-10) — Step 1의 직접 작성/대화형 AI 작사 탭과 Step 2의 Simple/Advanced 모드를 복원하고, AI 가사 적용·실제 GenerateRequest 상태를 보존. build/lint/test 통과. See RESULT.md.
- [Done] Workspace Create Song 3단계 모달 + 생성 진행/완료 경험 리뉴얼 (2026-08-10) — 기존 `/workspace` 안에서 실제 API·크레딧·폴링·오디오 상태를 보존한 채 Lyrics→Sound→Create 모달, 모바일 가로/데스크톱 세로 단계, 영상 기반 진행·완료·환불 실패 상태를 구현. 단위 테스트/build/lint 통과. See RESULT.md.
- [Done] 모달 기반 Google 인증 전환 (2026-08-10) — 랜딩/가격/보호 워크스페이스 흐름의 `/auth` 이탈을 모달로 통일하고, OAuth returnTo 복원·Create Song 자동 오픈·기존 세션/Google 처리 보존. 5 tests/build 통과, lint 오류 0개. See RESULT.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
