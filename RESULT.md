# RESULT: Lyrics sync 2차 리뷰 P0 findings 5건 수정 - 2026-07-13

## Background
사용자가 별도로 작성된 리뷰 문서(`LA_MUSICA_LYRICS_SYNC_REVIEW.md`)를 공유 — synced-lyrics 파이프라인(`lib/lyrics/sync.ts`, `lib/lyrics/ensureLyricsSync.ts`, `lib/player/lyrics.ts`, `WorkspaceShell.tsx`)에 대한 2차 리뷰로, 하루 전(2026-07-12) 이미 findings 7건을 수정한 세션(`RESULT_ARCHIVE.md`)과는 별개의 이슈를 지적했다. 코드 대조로 리뷰의 P0 5건이 모두 실재함을 확인 후 사용자 승인 하에 TDD로 수정했다.

## Implementation

### Fix #1 — `findActiveLineIndex` 기본값 -1
`lib/player/lyrics.ts`의 fallback이 `return 0`이라 첫 timestamp 도달 전에도 항상 첫 줄이 활성화되던 버그. `-1`로 변경. `LyricsView.tsx`는 이미 `i === activeIdx` 비교만 쓰고 있어 별도 UI 변경 불필요(어떤 줄도 활성화되지 않음, `nearActive`는 부작용 없이 다음 줄들을 은은하게 표시).

### Fix #2 — `line_index` 기준 정렬 + 단조 증가 검증
`buildLrcFromTimedMatches`가 `start_ms` 기준으로만 정렬해, Gemini가 반복 후렴구/애드리브를 잘못 들어 순서가 꼬인 `start_ms`를 반환하면 가사 표시 순서 자체가 깨질 수 있었다. 내부 로직을 `normalizeTimedMatches`로 추출해 `line_index` 기준 정렬로 바꾸고, 이전에 채택된 항목의 `start_ms`보다 작거나 같은 항목은 (line_index가 이어져도) 드롭하는 단조 증가 검증을 추가.

### Fix #3 — coverage ratio 검증
Gemini가 전체 가사 줄의 일부만 반환해도 LRC가 비어있지만 않으면 무조건 `synced`로 처리되던 문제. `computeLyricsSyncCoverageRatio`(normalizeTimedMatches 결과 개수 / 전체 줄 수)를 추가하고, `generateLyricsLrcFromAudio`에서 `MIN_LYRICS_SYNC_COVERAGE_RATIO`(0.85) 미만이면 `insufficient_alignment_coverage`로 실패 처리 — partial match가 부분 성공한 것처럼 보이지 않게 함.

### Fix #4 — Gemini 파일 `ACTIVE` 상태 polling
`uploadAudioFileToGemini`가 파일 finalize 직후 상태 확인 없이 바로 `generateContent`를 호출하고 있었다(파일이 `PROCESSING`인 상태에서 요청이 실패할 수 있음). `pollGeminiFileUntilActive(file, apiKey, opts)`를 신규 추가 — `FAILED`/`CANCELLED`면 즉시 실패, 지정 횟수(기본 30회, 1초 간격) 내에 `ACTIVE`가 안 되면 timeout 에러. `generateLyricsLrcFromAudio`에서 업로드 직후 호출하도록 연결.

### Fix #5 — 가사 싱크 전용 클라이언트 폴링 시작 시각 분리
`WorkspaceShell.tsx`의 `pollStartedAt`이 트랙 전체 폴링(음악 생성) 시작 시각을 가사 싱크 cutoff에도 그대로 재사용하고 있어, 생성이 오래 걸리면 가사 싱크에 남는 폴링 여유 시간이 줄어드는 문제(어제 Fix #2는 "무한 폴링 방지"만 다뤘고 타이머 분리는 안 함). `resolveLyricsPollStart(existingStartMs, metadata, nowMs)`를 신규 추가 — 가사 싱크가 실제로 필요해진 첫 tick에만 시각을 기록하고, 이미 기록됐으면 그대로 유지, 더 이상 필요 없으면 `undefined`. `WorkspaceShell.tsx`에 별도 `lyricsPolling` ref(Map)로 연결해 `polling` ref(트랙 폴링 시작 시각)와 분리.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 단위 테스트 | `npx vitest run` | Passed (20 files / 158 tests) |
| 타입체크 | `npx tsc --noEmit` | Passed |
| Build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors, 기존 `FullScreenPlayer` `<img>` warning 1개 유지) |

## Lessons
- 전날 세션에서 findings 7건을 이미 고쳤더라도, "동일 파일에 대한 리뷰"가 항상 동일한 이슈를 반복 지적하는 건 아니다 — 코드를 실제로 대조하지 않고 "어제 다 고쳤다"고 가정했다면 이번 5건을 놓쳤을 것.
- `buildLrcFromTimedMatches`처럼 정렬 기준(`start_ms` vs `line_index`) 하나가 전체 결과의 정합성을 좌우하는 경우, 기존 테스트가 우연히 통과하는 입력만 쓰고 있으면(이번 케이스는 `start_ms` 순서와 `line_index` 순서가 늘 일치하는 예시들뿐이었음) 회귀를 못 잡는다 — 두 기준이 갈리는 예시를 반드시 테스트에 넣어야 실제 정렬 로직을 검증한 게 된다.
- 클라이언트 폴링 cutoff처럼 "언제부터 카운트하는지"가 핵심인 로직은 순수 함수(`resolveLyricsPollStart`)로 뽑아 유닛 테스트하고, 컴포넌트에는 그 반환값을 ref에 반영하는 배선만 남기는 편이 React 클로저 안에 검증 불가능한 상태 로직을 묻어두는 것보다 안전하다.
