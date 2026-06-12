# PLAN.md

완료 계획 = `RESULT.md` 에 구현/검증 기록. 이 파일 = 활성/예정만 유지. 완료 항목은 `[Done]` 한 줄 축약, 10개 초과 시 오래된 것부터 삭제.

## Pending Approval
(없음)

## In Progress
(없음)

## Done

- [Done] Music card metadata cleanup (2026-06-12) — 생성 중인 음악은 제목 아래 메타 줄 숨김. 완료된 곡은 길이와 날짜 사이 `*` 구분자 제거. ✅ build/lint 통과. 상세 RESULT.md.
- [Done] Music card duration fallback fix (2026-06-12) — 카드 `1:00` 하드코딩 fallback 제거, 실제 길이 미확인 시 `--:--` 표시. 플레이어 60초 fallback 제거. audio metadata 로드 시 실제 duration을 로컬 상태와 `duration_seconds`에 저장. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] Workspace 플레이어 즉시 재생/전체폭/컨트롤 정리 (2026-06-12) — 카드 재생 첫 클릭 즉시 audio 재생. 플레이어 가로 전체폭 확장. 상단 진행바를 현재 시간/흰색 seek progress/전체 길이 구조로 변경. 하단 seek 줄 제거, 컨트롤 확대/중앙 정렬, glow·shadow 효과 제거. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] Workspace 하단 연동 음악 플레이어 추가 (2026-06-11) — 위쪽 뮤직 카드 재생 클릭 시 PromptBox 아래 플레이어 표시. 단일 audio 상태로 카드/플레이어 play·pause·seek·volume 동기화. 기본 앨범 썸네일 포함, inline style 없이 Tailwind 클래스 기반 구현. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] Workspace 검색/액션 아이콘 정리 (2026-06-11) — 중앙 SearchInput 제거, 기존 navbar search input으로 필터 이벤트 연결. 보라색 파형 컴포넌트 제거, 드롭다운 트리거 세로 점 SVG로 변경. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] Workspace DB 곡 목록/관리 액션 추가 (2026-06-11) — 저장된 내 `musics` 목록 중앙 표시, Search + 트랙 행 UI + Rename/Download/Delete 메뉴. Rename/Delete API 추가로 DB 즉시 반영. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] musicgen → minimax/music-2.6 교체 (2026-06-11) — Replicate 인프라 유지, 보컬 부르는 모델로 전환. lyrics 진짜 보컬. duration UI 제거(길이 제어 불가) → Instrumental 토글로 교체. `buildMinimaxInput`, `predictions.create({model})`. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] PromptBox 개편 (2026-06-11) — 첨부/Tools/Mic 제거, Lyrics·Style·Duration(1m/2m/3m) 추가. `onSend` 객체화 → workspace/API/lib 연결. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] AI 음악 생성 (2026-06-11) — 프롬프트 → Replicate musicgen 비동기 예측 → 폴링 → mp3 를 InsForge `musics` 버킷 복사 → 행 finalize. ✅ build/lint 통과 ✅ Replicate 토큰·모델 버전 검증. 상세 RESULT_ARCHIVE.md.

## Future / 추후

(없음)
