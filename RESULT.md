# RESULT: MP3 메타데이터·플레이어 UX 수정 3건 - 2026-07-10

## Background
1. 다운로드 MP3에 앨범 커버 미삽입 (커버 있어도 iOS Music에 미표시)
2. 모바일 MiniPlayer 프로그레스바 시간 레이블(0:20 / 3:00)이 아래 컨텐츠와 가로 정렬 어긋남
3. 트랙 드롭다운 메뉴에서 외부 클릭 시 닫히지 않음 + 다운로드 클릭 후 메뉴 잔존

## Implementation

### Fix 1 — 앨범 커버 미삽입
`app/api/music/[id]/download/route.ts`에서 `cover_url`만 보던 것을 `cover_url ?? thumbnail_url` fallback으로 수정. MIME type도 `image/` 접두어 검증 추가.

### Fix 2 — 프로그레스바 시간 레이블 정렬
`PlayerProgressBar.tsx`: `grid-cols-[42px·bar·42px] gap-3` 구조 제거 → 바 아래 `flex justify-between`으로 시간 레이블 이동. 좌우 모두 `px-3` 기준에 맞아 아래 행(썸네일/컨트롤)과 완벽 정렬.

### Fix 3 — 드롭다운 click-outside
`TrackCard.tsx`·`music-workspace.tsx` TrackRow 양쪽에 `useRef`(menu div + trigger button) + `useEffect`(`pointerdown` 리스너) 추가. 메뉴·트리거 바깥 클릭 시 메뉴 닫힘. 다운로드 링크에 `onClick={onToggleMenu}` 추가로 다운로드 즉시 닫힘.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 타입체크/빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors, warning 1개(기존 동일) |

## Lessons
- InsForge storage URL은 크로스 오리진이라 `download` attr 무시됨 → same-origin API 엔드포인트로 변경 시 click-outside 같은 부수 효과도 함께 수동 처리 필요.
- `cover_url`과 `thumbnail_url`은 독립 생성 타이밍 → 다운로드·공유 시 fallback 필수.
