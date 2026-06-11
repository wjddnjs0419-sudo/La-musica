# PLAN.md

완료 계획 = `RESULT.md` 에 구현/검증 기록. 이 파일 = 활성/예정만 유지. 완료 항목은 `[Done]` 한 줄 축약, 10개 초과 시 오래된 것부터 삭제.

## Pending Approval
(없음)

## In Progress
(없음)

## Done

- [Done] musicgen → minimax/music-2.6 교체 (2026-06-11) — Replicate 인프라 유지, 보컬 부르는 모델로 전환. lyrics 진짜 보컬. duration UI 제거(길이 제어 불가) → Instrumental 토글로 교체. `buildMinimaxInput`, `predictions.create({model})`. ✅ build/lint 통과. 상세 RESULT.md.
- [Done] PromptBox 개편 (2026-06-11) — 첨부/Tools/Mic 제거, Lyrics·Style·Duration(1m/2m/3m) 추가. `onSend` 객체화 → workspace/API/lib 연결. ✅ build/lint 통과. 상세 RESULT_ARCHIVE.md.
- [Done] AI 음악 생성 (2026-06-11) — 프롬프트 → Replicate musicgen 비동기 예측 → 폴링 → mp3 를 InsForge `musics` 버킷 복사 → 행 finalize. ✅ build/lint 통과 ✅ Replicate 토큰·모델 버전 검증. 상세 RESULT_ARCHIVE.md.

## Future / 추후

(없음)
