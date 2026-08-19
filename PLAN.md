# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Workspace/Create Song 모바일 밀도 최적화 (2026-08-10) — 단계별 모달 크기 변동을 고정 프레임·내부 스크롤로 제거하고, workspace의 모바일 상단·목록·mini player 여백을 균형 있게 압축.

## Done
- [Done] Create Song 모달 축소·내부 여백 통일 (2026-08-18) — 672×600px 최대 프레임·중앙 정렬을 적용하고 내부 여백을 20/24px로 통일. build 통과, lint 오류 0개.
- [Done] 생성 완료 화면 길이 숨김 (2026-08-18) — 메타데이터 로드 전 `--:--`가 보이지 않도록 길이 행 제거. build 통과, lint 오류 0개.
- [Done] 전체화면 플레이어 Now playing 라벨 제거 (2026-08-18) — 중앙 헤더 라벨을 제거. build 통과, lint 오류 0개.
- [Done] 전체화면 플레이어 가사 라벨·진행바 정렬 보정 (2026-08-18) — 데스크톱 가사 라벨을 제거하고 진행바를 닫기 버튼·볼륨 슬라이더 끝에 정렬. build 통과, lint 오류 0개.
- [Done] 전체화면 플레이어 런타임 가사 하이라이트 제거 (2026-08-18) — 가사 표시는 유지하며 재생 시간 기반 강조·자동 스크롤만 제거. build/test 통과, lint 오류 0개.
- [Done] 음악 목록 일시정지 재생 아이콘 대비 보정 (2026-08-18) — 활성·일시정지 상태 Play 아이콘을 검정으로 명시. build 통과, lint 오류 0개.
- [Done] Create Song 언어 Auto 중복 제거 (2026-08-18) — Select의 하드코딩된 Auto를 제거하고 LANGUAGE_OPTIONS를 단일 기준으로 사용. build 통과, lint 오류 0개.
- [Done] 신규 로고 자산 전환 (2026-08-18) — 공용 Logo·파비콘/Apple 아이콘·구조화 데이터의 레거시 자산 참조를 `logo.png`와 `wordmark.png`로 교체. build 통과, lint 오류 0개.
- [Done] Create Song 단계별 필드 여백 정합성 점검 (2026-08-18) — Advanced의 Style 앞 간격을 28px로 통일하고 Step 1~3 그룹 간 여백을 대조. build 통과, lint 오류 0개.
- [Done] Hero 서브카피 줄바꿈·보조 문구 대비 조정 (2026-08-18) — 서브카피를 간결하게 다듬고 무료/구독 안내를 `white/60`으로 조정. build 통과, lint 오류 0개.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
