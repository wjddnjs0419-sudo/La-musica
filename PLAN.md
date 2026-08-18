# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Workspace/Create Song 모바일 밀도 최적화 (2026-08-10) — 단계별 모달 크기 변동을 고정 프레임·내부 스크롤로 제거하고, workspace의 모바일 상단·목록·mini player 여백을 균형 있게 압축.

## Done
- [Done] Create Song 언어 Auto 중복 제거 (2026-08-18) — Select의 하드코딩된 Auto를 제거하고 LANGUAGE_OPTIONS를 단일 기준으로 사용. build 통과, lint 오류 0개.
- [Done] 신규 로고 자산 전환 (2026-08-18) — 공용 Logo·파비콘/Apple 아이콘·구조화 데이터의 레거시 자산 참조를 `logo.png`와 `wordmark.png`로 교체. build 통과, lint 오류 0개.
- [Done] Create Song 단계별 필드 여백 정합성 점검 (2026-08-18) — Advanced의 Style 앞 간격을 28px로 통일하고 Step 1~3 그룹 간 여백을 대조. build 통과, lint 오류 0개.
- [Done] Hero 서브카피 줄바꿈·보조 문구 대비 조정 (2026-08-18) — 서브카피를 간결하게 다듬고 무료/구독 안내를 `white/60`으로 조정. build 통과, lint 오류 0개.
- [Done] Reggaeton-first repositioning (2026-08-18) — Reggaeton 전용 Sound UX·프롬프트/API 강제·Spanish/Spanglish 자동 가사 규칙과 제공된 Hero/CTA 클럽 이미지를 적용. 157 tests/build 통과, lint 오류 0개.
- [Done] Replicate Google Lyria 3 Pro 전환 (2026-08-18) — 신규 생성은 `google/lyria-3-pro` provider를 사용하고, Lyria 단일 프롬프트·$0.08/파일 비용·파일 출력 정규화를 적용. 기존 ACE-Step job 조회 호환 유지. 151 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] 음악 생성 provider 추상화 (2026-08-18) — ACE-Step/Replicate 음악 lifecycle을 provider adapter로 분리하고, 기존 prediction_id 복구 호환성과 MiniMax/MusicGen 레거시 레퍼런스를 추가. 148 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] Viral Pack 크레딧 정책 35곡 정합성 복구 (2026-08-18) — 앱 플랜 정의·checkout 메타데이터·랜딩/약관 표시·README를 실제 DB 정산 기준으로 통일. 141 tests/build 통과, lint 오류 0개. See RESULT.md.
- [Done] Credit 구매 카드 CTA 정렬 보정 (2026-08-12) — Popular 배지가 있는 Creator 카드를 포함해 모든 Get credits 버튼을 카드 하단 기준선에 고정. build 통과, lint 오류 0개. See RESULT.md.
- [Done] Google Analytics 4 연결 (2026-08-12) — production 환경변수·전역 GA4 태그·개인정보처리방침 고지를 적용하고 production HTML의 측정 ID를 검증. build 통과, lint 오류 0개. See RESULT.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
