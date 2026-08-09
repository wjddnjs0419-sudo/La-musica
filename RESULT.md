# RESULT: Workspace Library + Music Player 리뉴얼 - 2026-08-10

## Background

`workspace_renew`은 카드 대신 넓은 음악 목록과 하단 재생 바, 몰입형 전체화면 플레이어를 제시했지만 기존 `/workspace`는 좁은 카드 목록과 문서 흐름 안의 재생 카드를 사용했다.

## Implementation

- Library를 `Library / My music` 헤더, 생성 버튼, 넓은 행 기반 곡 목록으로 교체했다. 데스크톱 행은 재생·56px 앨범아트·제목·생성일·길이·메뉴를, 모바일 행은 핵심 정보와 상태만 표시한다.
- pending/processing, failed, rename, download, delete, optimistic track, 검색, 페이지네이션을 기존 콜백과 상태 그대로 보존했다.
- mini player를 화면 하단 고정 바로 옮기고, 목록의 하단 여백을 동적으로 확보했다. 데스크톱은 곡 정보/운송 컨트롤/진행·볼륨·닫기의 3영역, 모바일은 컴팩트 바다.
- full-screen player는 현재 커버 기반의 어두운 블러 배경을 유지하며, 데스크톱에서 앨범아트·곡 정보와 스크롤 가사를 두 열로 표시한다. 가사 없는 instrumental은 빈 가사 열 없이 큰 아트워크 중심으로 렌더링한다.
- 전체화면의 볼륨도 기존 Workspace 상태와 연결해 mini/full-screen 사이에서 같은 오디오 엘리먼트를 제어한다. 재생 위치·재생 상태·이전/다음·seek·close는 모두 기존 흐름을 재사용한다.

## Verification Matrix

| Change | Checks | Result |
|---|---|---|
| Existing automated suite | `npm test` | 21 files, 139 passed |
| Production build + types | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors; 기존 배경용 `<img>` warning 1개 |
| Diff hygiene | `git diff --check` | Passed |
| Visual screenshot gate | Browser/Playwright availability | Skipped: neither tool available; local dev server not running |

## Lessons

- 플레이어를 고정 레이어로 옮길 때는 스크롤 콘텐츠의 하단 여백을 상태에 따라 함께 조정해야 마지막 목록 행이 가려지지 않는다.
- 전체화면의 컨트롤을 새로 만들기보다, 기존 오디오 상태를 그대로 전달하면 mini player와 full-screen 사이의 재생 연속성을 보장할 수 있다.
