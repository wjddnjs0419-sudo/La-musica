# CLAUDE.md — AI Agent Router (La Musica)

> **CRITICAL:** Claude Code 가 이 파일을 자동 로드해 가이드로 사용. 셸 명령을 스스로 실행하진 않음.

## 🚀 Bootstrap Sequence
토큰 절약: **Grep-first**. 시작 시 전체 읽기 금지.

1. **Context Summary**: `grep -nE "^##|^###" PLAN.md RESULT.md` (활성 작업 + 최신 결과 빠른 파악).
2. **Targeted Read**:
   - `PLAN.md` 의 `## In Progress` 섹션만.
   - `RESULT.md` (최신 1건으로 정리됨).
   - `RESULT_ARCHIVE.md` 는 과거 이력 조사할 때만.
3. **프로젝트 규칙**은 `AGENTS.md` (아래 `@AGENTS.md` 로 자동 포함).

## 💡 Shortcuts
- **`ㅎㅇ`**: 인사가 아니라 **필수 부트스트랩 명령**. 정확히 `ㅎㅇ` 메시지면 부트스트랩 시퀀스 먼저 수행하고, 첫 응답을 간결한 컨텍스트 요약으로 시작.
- **`종료`**: 문서 정리(PLAN/RESULT 갱신) → `npm run build` + `npm run lint` 확인 → 커밋·푸시 준비.

## ⚠️ Core Reminders
- **Korean Only**: 한국어로 소통.
- **Plan Before Code**: 계획 제시 → 승인 후 편집.
- **Validate**: 변경 후 `npm run build` + `npm run lint` 통과 확인.
- **No Hardcoding**: 키/시크릿 하드코딩·커밋 금지 (`.env.local` / `.insforge`).
- **InsForge 규약**: insert 는 배열 `insert([{...}])`, storage 업로드는 `url`+`key` 둘 다 저장, RLS 는 `auth.uid()`.

@AGENTS.md

---
*과거 세션 기록은 `RESULT_ARCHIVE.md`.*
