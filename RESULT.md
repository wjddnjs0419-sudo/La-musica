# RESULT: Workspace 플레이어 즉시 재생/전체폭/컨트롤 정리 — 2026-06-12

## 배경
- 요청: 뮤직 카드 재생 버튼 첫 클릭 시 플레이어만 뜨고 바로 재생되지 않는 문제 수정.
- 요청: `PromptBox` 아래 플레이어를 가로 전체 폭으로 확장.
- 요청: 상단 진행바를 seek 가능하게 만들고, 초록색이 아닌 흰색 진행바로 변경.
- 요청: 플레이어 내부 glow/그림자 효과 제거, 하단 흰색 seek 줄 제거, 중앙 재생/이전/다음 버튼을 크게 하고 세로 중앙 정렬.

## 구현
- **`components/music-workspace.tsx`**: 카드에서 새 트랙 재생 시 단일 audio에 `src` 설정 후 `load()`와 `play()`를 같은 클릭 흐름에서 실행하도록 정리. React `src` prop 의존을 제거해 첫 클릭 재생 타이밍을 안정화.
- **`components/music-workspace.tsx`**: `PromptBox`는 기존 `max-w-3xl`을 유지하고, 플레이어 래퍼는 `w-full`로 분리해 하단 플레이어가 화면 가로 폭을 사용하도록 변경.
- **`components/workspace-music-player.tsx`**: 상단 진행 영역을 `현재 시간 | seek 가능한 흰색 progress | 전체 길이` 구조로 변경. 시각 진행은 `<progress>`, 조작은 투명 range가 담당.
- **`components/workspace-music-player.tsx`**: 하단 흰색 seek 입력 제거. 이전/재생/다음 버튼 크기 확대 및 중앙 정렬.
- **`components/workspace-music-player.tsx`**: player container, 기본 앨범 썸네일, 아이콘에서 shadow/drop-shadow/blur/glow 계열 효과 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입/빌드 | `npm run build` | 통과 |

## 교훈
- media element는 트랙 교체 시 `src` 설정, `load()`, `play()` 순서를 클릭 핸들러 안에서 명확히 처리해야 첫 클릭 재생이 안정적임.
- range의 기본 thumb를 숨기고 진행 상태만 보여야 할 때는 `<progress>`로 시각 상태를 표현하고 투명 range를 조작 레이어로 겹치는 방식이 inline style 없이 깔끔함.

## 배포
- 미배포(로컬). git 커밋/푸시는 사용자 요청 필요.
