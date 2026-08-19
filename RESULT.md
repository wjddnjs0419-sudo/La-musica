# RESULT: Create Song 모달 축소·내부 여백 통일 및 생성 길이 숨김 - 2026-08-18

## Background

Create Song 모달이 과도하게 크게 보이는 문제를 완화하고, 모든 내부 상태에서 상하좌우 여백을 동일한 기준으로 맞춘다. 생성 직후 아직 메타데이터가 없는 경우 표시되던 `--:--` 길이 표기도 숨긴다.

## Implementation

- 모달을 모든 화면에서 중앙 정렬하고, 최대 크기를 너비 672px·높이 600px로 제한했다.
- 헤더, 단계 본문, 하단 액션, 생성 중·성공·실패 상태에 동일한 내부 여백(`20px`, `sm` 이상 `24px`)을 적용했다.
- 생성 완료 화면에서 길이 행을 제거해 메타데이터 로드 전 `--:--`가 노출되지 않도록 했다.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | 0 errors; existing FullScreenPlayer `<img>` warning 1개 |
| `git diff --check` | Passed |
| `git diff --check` | Passed |

## Lessons

- 상태별 컴포넌트가 서로 다른 컨테이너를 사용해도, 공통 padding 토큰을 적용하면 모달 내부 리듬을 일관되게 유지할 수 있다.
