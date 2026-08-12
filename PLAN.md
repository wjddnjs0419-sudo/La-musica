# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Workspace/Create Song 모바일 밀도 최적화 (2026-08-10) — 단계별 모달 크기 변동을 고정 프레임·내부 스크롤로 제거하고, workspace의 모바일 상단·목록·mini player 여백을 균형 있게 압축.

## Done
- [Done] Credit 구매 카드 CTA 정렬 보정 (2026-08-12) — Popular 배지가 있는 Creator 카드를 포함해 모든 Get credits 버튼을 카드 하단 기준선에 고정. build 통과, lint 오류 0개. See RESULT.md.
- [Done] Google Analytics 4 연결 (2026-08-12) — production 환경변수·전역 GA4 태그·개인정보처리방침 고지를 적용하고 production HTML의 측정 ID를 검증. build 통과, lint 오류 0개. See RESULT.md.
- [Done] Google Search 색인·기술 SEO 설정 (2026-08-12) — Search Console 소유권 확인 후 robots/sitemap, canonical·검색 메타데이터, JSON-LD를 production 배포하고 공개 URL·heading 구조를 검증. build 통과, lint 오류 0개. See RESULT.md.
- [Done] CTA 모바일 배경 이미지 교체 (2026-08-10) — 제공된 1080×1350 세로 이미지를 모바일 CTA에 적용하고 데스크톱 배경은 유지. build/lint 오류 0개 통과. See RESULT.md.
- [Done] OG 공유 이미지 교체 (2026-08-10) — 제공된 La Musica 이미지로 `public/og-image.png`를 교체하고 OG 크기 메타데이터를 1731×909로 정합. build/lint 오류 0개 통과. See RESULT.md.
- [Done] 모바일 전체화면 플레이어 격리 (2026-08-10) — opaque player root로 workspace/mini player bleed를 차단하고, 모바일 artwork·metadata·lyrics·footer를 경계가 있는 영역으로 분리. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Privacy/Terms UI 리뉴얼 (2026-08-10) — shared LegalPage를 current La Musica near-black header·legal reading column으로 교체하고 Footer 없이 문서·metadata·링크를 보존. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Workspace shell fidelity correction (2026-08-10) — 목표 시안 기준의 90px 헤더·Credits/프로필 메뉴·Library 검색/폭·축소된 Credits 모달을 구현하고, 하단 Create Song 프롬프트는 제거하며 mini player는 기존 카드 구조로 유지. 실제 checkout·coupon·오디오·Create Song 로직 보존. build/lint 오류 0개 통과. See RESULT.md.
- [Done] Workspace Library + Music Player 리뉴얼 (2026-08-10) — 기존 `/workspace`의 실제 검색·곡 관리·오디오·생성 상태를 유지하며 행 기반 Library, 하단 고정 mini player, 앨범아트+가사 2열 전체화면 player 및 모바일 세로 player를 구현. 139 tests/build/lint 오류 0개 통과. See RESULT.md.
- [Done] Desktop Create Song 모달 레이아웃 교정 (2026-08-10) — 모달 높이를 단계와 무관하게 고정하고, 좌측 Lyrics/Sound/Create 버튼의 폭·높이를 균일화하며 우측 콘텐츠만 스크롤하도록 변경. build/lint/test 통과. See RESULT.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
