# RESULT_ARCHIVE.md

과거 세션 RESULT 누적(최신이 위). 신규 완료는 `RESULT.md` 에 작성하고, 다음 작업 시작 시 직전 `RESULT.md` 내용을 이 파일 상단으로 옮김.

---

# RESULT: Synced-lyrics 기능 배포 전 리뷰 findings 7건 수정 - 2026-07-12

## Background
"synced lyrics 배포 전 테스트"를 요청받아 `code-review` 스킬(고효율, 5개 finder 에이전트 병렬)로 아직 커밋되지 않은 synced-lyrics 기능(LRC 파싱 + Gemini 오디오 정렬 백그라운드 sync 파이프라인) 전체를 검토했다. 정확성 findings 7건이 나왔고, 그중 4건(#1/#2/#4/#5)은 배포 시 기능이 아예 동작하지 않거나(서버리스 종료로 백그라운드 작업 소실) 비용이 새는(동시성 가드 부재로 Gemini 중복 호출, 배포 시 기존 카탈로그 소급 트리거) 심각도였다. 사용자 승인 하에 7건 전부를 TDD로 수정했다.

## Implementation

### Fix #7 — finalize UPDATE 이중쓰기 가드
`app/api/music/[id]/route.ts`의 `processing → completed` UPDATE에 `.eq("status", "processing")` 가드 추가 (reconcile-music의 `markCompleted`와 동일 패턴). 중복 finalize 요청이 lyrics-sync 상태를 되돌리는 경로를 차단.

### Fix #6 — stage-direction 정규식이 실제 가사를 지우는 문제
`lib/lyrics/format.ts`를 두 갈래로 분리했다: `sanitizeLyricsForModel`(음악 생성 모델 페이로드용, `buildLyricsPayload.ts`가 사용)은 소괄호 stage-direction 스트리핑을 그대로 유지 — 생성 모델에게 instrumental gap을 알려주는 정당한 용도라 회귀시키지 않았다. `lyricDisplayLines`(플레이어 표시 + Gemini 정렬 ground truth, `lib/player/lyrics.ts`/`lib/lyrics/sync.ts`가 사용)는 소괄호를 절대 건드리지 않도록 바꾸고, 대괄호도 인식된 태그/방향 지시일 때만 제거하도록(무조건 leading bracket 제거하던 버그 포함) 좁혔다. `lib/lyrics/format.test.ts` 신규 + 기존 `lyrics.test.ts`/`buildLyricsPayload.test.ts` 기대값 갱신.

### Fix #5 + #4 + #1 — 공유 오케스트레이션 모듈 + CAS 가드 + `after()`
`lib/lyrics/ensureLyricsSync.ts`를 신규로 만들어 두 라우트(`app/api/internal/reconcile-music/route.ts`, `app/api/music/[id]/route.ts`)에 ~110줄씩 복붙돼 있던 `ensureLyricsSyncStarted`/`syncLyricsInBackground`/`updateMusicMetadata`를 하나로 통합했다.
- `pending → syncing` 전환은 `.eq("metadata->>lyrics_sync_status", observedStatus)`(명시값 없으면 `.is("metadata->lyrics_sync_status", null)`) CAS 가드로 감싸, 두 트리거(cron + 클라이언트 poll)가 동시에 관측해도 하나만 실제로 sync를 시작하게 했다. 가드가 안 맞으면(이미 다른 프로세스가 선점) 아무 것도 하지 않고 반환.
- `syncing`으로 3분 넘게 멈춰 있으면(백그라운드 작업이 죽은 것으로 간주) 같은 CAS로 재시도를 허용 — "stuck" 복구 경로.
- 최종 synced/failed/skipped 기록도 `.eq("metadata->>lyrics_sync_status", "syncing")` 가드를 걸어, 뒤늦게 끝난 중복 실행이 이미 확정된 결과를 덮어쓰지 못하게 했다.
- 실제 오디오 업로드+정렬(`syncLyricsInBackground`)은 `next/server`의 `after()`로 감싸 응답 반환 후에도 실행이 보장되도록 하고, 두 라우트에 `export const maxDuration = 90` 추가. CAS 쓰기 자체는 빠르므로 두 라우트 모두 `await ensureLyricsSyncStarted(...)`로 통일(이전엔 reconcile 쪽만 fire-and-forget).
- `lib/lyrics/ensureLyricsSync.test.ts` 신규(9 tests): CAS 성공/충돌/stale 재시도/IS NULL 가드/synced·skipped·failed 결과 기록을 admin 클라이언트 mock으로 검증.

### Fix #2 — 클라이언트 무한 폴링 방지 + 죽은 파일 제거
`lib/lyrics/sync.ts`에 순수 함수 `shouldStopLyricsPolling(startedAtMs, nowMs, maxWaitMs = 2분)` 추가. `components/workspace/WorkspaceShell.tsx`의 `polling` ref를 `Set<string>`에서 `Map<string, number>`(폴링 시작 시각 기록)로 바꾸고, lyrics 폴링 지속 조건에 이 cutoff를 결합해 2분 넘도록 안 끝나면 lyrics 폴링만 중단한다(트랙 상태 폴링과 무관). 아무데서도 import되지 않던 죽은 컴포넌트 `components/music-workspace.tsx`(리팩터 이전 monolith, `git grep`으로 재확인 후) 삭제.

### Fix #3 — 기존 카탈로그 소급 백필 마이그레이션
`migrations/20260712112811_backfill-lyrics-sync-status-skipped.sql` 작성/적용. `status='completed'`이고 `metadata->>'lyrics_sync_status'`가 없는 행을 전부 `"skipped"`로 백필 — 신규 생성곡만 auto-sync 대상이 되도록 하고, 배포 직후 워크스페이스 첫 로드에서 기존 곡들이 무더기로 Gemini 호출을 트리거하는 걸 막았다. 적용 전 대상 카운트를 InsForge CLI로 확인(완료곡 47개 중 20개 대상), 적용 후 재확인해 0개로 백필 완료 확인.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 단위 테스트 | `npx vitest run` | Passed (19 files / 141 tests) |
| 타입체크 | `npx tsc --noEmit` | Passed |
| Build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors, 기존 `FullScreenPlayer` `<img>` warning 1개 유지) |
| 백필 마이그레이션 | InsForge CLI `db query` 전/후 카운트 | 20개 대상 → 0개 잔여 확인 |

## Lessons
- 리뷰에서 나온 findings를 순서 없이 바로 고치기보다, 의존관계(공유 모듈 추출이 CAS 가드·`after()` 적용을 한 곳에서만 고치게 해줌)를 먼저 따져 묶어서 처리하는 편이 총 작업량이 줄었다 — 7건이 실질적으로 5개 구현 단계로 수렴.
- 같은 `stripStageDirections` 로직을 "화면 표시"와 "생성 모델 페이로드" 두 군데가 공유하고 있었는데, 전자만 고쳐야 할 버그를 공유 함수에서 고치면 후자(정당한 동작)에 회귀가 생긴다 — 공유 코드를 고칠 땐 모든 소비자의 요구사항이 실제로 같은지 먼저 확인해야 한다.
- 마이그레이션 적용 전 `SELECT count(*)`로 실제 영향받는 행 수를 먼저 확인한 게 유효했다 — "47개 완료곡 중 20개가 소급 트리거 대상"이라는 구체적 숫자가 나오고 나서야 이 finding이 가설이 아니라 실제 문제였음이 확인됐다.

---

# RESULT: Auto-generate LRC after audio completion Phase 2 - 2026-07-11

## Background
Phase 1까지는 `lyrics_lrc`가 이미 있을 때만 true timed playback이 가능했고, timestamp가 없는 가사는 플레이어가 approximate sync를 런타임 계산해 보여줬다. 이번 작업에서는 completed mp3와 최종 `lyrics_payload`를 기준으로 user lyrics와 AI-generated lyrics 모두 같은 post-generation alignment를 거쳐 `metadata.lyrics_lrc`를 자동 저장하도록 연결했다.

## Implementation

### Fix 1 — Gemini audio alignment helper
`lib/lyrics/sync.ts`를 추가했다. 이 모듈은 `lyrics_sync_status` 판정(`pending` / `syncing` / `synced` / `failed` / `skipped`), 기존 timed lyrics 감지, canonical LRC 직렬화, 그리고 Gemini audio file upload + structured JSON alignment 응답을 `metadata.lyrics_lrc` 형식으로 바꾸는 로직을 담당한다. 정렬 결과는 원문 재작성 대신 line index + `start_ms`만 받아 source lyric lines를 그대로 LRC에 다시 조립한다.

### Fix 2 — generation/finalize metadata state machine
`app/api/music/generate/route.ts`는 generation row 생성 시점에 `lyrics_sync_status` 초기값을 함께 저장한다. instrumental/no-lyrics는 `skipped`, 이미 timed lyrics가 있으면 `synced`, 일반 가사는 `pending`으로 시작한다.

`app/api/music/[id]/route.ts`는 completed 전환 시 `pending` 상태를 유지한 채 row를 마무리하고, 직후 `syncing`으로 올린 다음 background alignment를 시작한다. 성공 시 `lyrics_lrc`, `lyrics_sync_model`, `lyrics_synced_at`, `lyrics_sync_status: "synced"`를 저장하고, 실패 시 `lyrics_sync_error`와 `lyrics_sync_status: "failed"`를 저장한다. 만약 completed row가 어떤 이유로 `pending`에 남아 있으면 subsequent poll에서 다시 sync를 시작하도록 recovery 경로도 넣었다.

### Fix 3 — cron reconcile parity + client polling
`app/api/internal/reconcile-music/route.ts`도 completed row를 만들 때 같은 metadata 초기화와 background lyrics sync를 시작하도록 맞췄다. 따라서 사용자 polling으로 완료된 곡과 cron reconcile로 완료된 곡이 같은 LRC pipeline을 탄다.

`components/workspace/WorkspaceShell.tsx`와 레거시 `components/music-workspace.tsx`는 polling 종료 조건에 `lyrics_sync_status`를 추가했다. 이제 `completed`가 먼저 와도 `lyrics_sync_status`가 `pending`/`syncing`이면 polling을 계속하고, `synced`/`failed`/`skipped`가 되면 멈춘다.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Lyrics sync helper tests | `npx vitest run lib/lyrics/sync.test.ts lib/player/lyrics.test.ts` | Passed (27 tests) |
| Lint | `npm run lint` | Passed (0 errors, 기존 `FullScreenPlayer` `<img>` warning 1개 유지) |
| Build/typecheck | `npm run build` | Passed |

## Lessons
- “같은 sync 파이프라인”과 “자동 LRC 생성”은 다른 단계다. 이번 Phase 2는 그 둘을 실제로 연결해 `completed -> syncing -> synced/failed/skipped` lifecycle을 만들었다.
- Gemini alignment는 line index만 반환받고 원문 lyric lines를 다시 조립하는 편이, 모델이 가사를 미세하게 바꾸는 문제를 막기에 더 안전하다.
- 이번 세션에서는 외부 Gemini alignment를 실제 앱 경로에 연결했지만, 실데이터 기준 quality tuning은 별도 후속 점검이 필요하다. 특히 반복 후렴, 애드립, 아주 짧은 훅에서는 prompt/model tuning 여지가 있다.

---

# RESULT: LRC parser + unified timed playback fallback Phase 1 - 2026-07-11

## Background
플레이어 highlighter는 지금까지 곡 길이에 가사 줄 수를 균등 분배하는 approximate sync만 사용했다. 이번 작업에서는 user lyrics와 AI-generated lyrics를 구분하지 않고, 동일한 `LyricLine[]` playback 경로에서 LRC timestamp를 우선 처리하도록 1차 기반을 만들었다. LRC가 없을 때 자동으로 true LRC를 만드는 것은 아니며, 그 경우 기존처럼 런타임 approximate timestamp를 계산한다. 실제 오디오를 분석해 LRC를 생성하는 post-generation alignment는 별도 Phase 2로 남겼다.

## Implementation

### Fix 1 — LRC 우선 파싱
`lib/player/lyrics.ts`에 `parseLrcLyrics()`를 추가했다. `[mm:ss.xx]` / `[mm:ss.xxx]` timestamp를 millisecond로 변환하고, 같은 줄에 여러 timestamp가 붙은 LRC 반복 라인도 각각 timed line으로 확장한다.

### Fix 2 — 통합 lyrics source 경로
`parseMusicLyrics()`가 `metadata.lyrics_lrc`를 최우선으로 읽고, 없으면 기존처럼 `lyrics_payload`, `lyrics` 순서로 fallback한다. 어느 필드든 LRC timestamp가 들어 있으면 duration 없이도 실제 timestamp 기반 `LyricLine[]`을 반환한다. LRC가 없으면 기존 10% intro / 85% vocal window approximate fallback을 유지하며, 이 fallback은 저장된 LRC가 아니라 플레이어 런타임 계산값이다.

### Fix 3 — 표시 정규화 재사용
LRC text도 기존 `lyricDisplayLines()` 정규화 경로를 통과한다. 따라서 section tag, instrumental/stage direction 제거 규칙은 approximate lyrics와 timed lyrics에서 동일하다.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| LRC parser unit tests | `npx vitest run lib/player/lyrics.test.ts` | Passed (19 tests) |
| User/auto unified path | Unit test with `lyrics_source: "auto"` + LRC in `lyrics_payload` | Passed |
| Fallback preservation | Existing approximate timing tests | Passed |

## Lessons
- AI lyrics도 생성 후에는 user lyrics와 같은 sync target이다. 차이는 timestamp source가 아니라 저장/생성 시점뿐이다.
- Phase 1은 playback contract와 approximate fallback을 통합한 것이고, true 자동 LRC 생성은 아직 아니다.
- Phase 2는 completed mp3 + final `lyrics_payload` 기준으로 `metadata.lyrics_lrc` 또는 구조화된 timing 필드를 채우는 post-generation alignment가 되어야 한다.

---

# RESULT: Workspace fast entry auth deblocking - 2026-07-11

## Background
이전 성능 작업은 `/workspace` 서버 렌더에서 `musics`/`user_credits` 조회를 제거했지만, 페이지 진입 전 `proxy.ts`의 `updateSession()`과 `/workspace` 서버 컴포넌트의 `getCurrentUser()`가 여전히 남아 있었다. 이미 로그인된 사용자도 workspace shell 표시 전에 auth 네트워크 왕복을 기다리는 구조라 UX가 느리게 느껴질 수 있었다.

## Implementation

### Fix 1 — `/workspace` 정적 shell 전환
`app/workspace/page.tsx`에서 InsForge SSR auth 조회를 제거하고 `WorkspaceShell loadInitialData`만 렌더하도록 변경했다. 빌드 route table에서 `/workspace`가 `○ Static`으로 전환됨을 확인했다.

### Fix 2 — bootstrap 단일 auth 경로
`/api/workspace/bootstrap`이 user/tracks/credit을 함께 반환하도록 확장했다. 클라이언트 shell은 bootstrap 성공 후 navbar 사용자 정보와 credit/tracks를 채우고, 401이면 `/auth`로 이동한다.

### Fix 3 — Proxy session update 제외
`proxy.ts` matcher에서 `/workspace`를 제외했다. 실제 권한 확인은 API 레벨에 남겨두고, 페이지 표시 전 세션 갱신 대기를 제거했다.

### Fix 4 — OAuth callback 중복 auth 조회 제거
`exchangeOAuthCode()` 응답에 포함된 `data.user.id`를 사용하도록 바꿔 callback 내부의 추가 `getCurrentUser()` 왕복을 제거했다. 무료 크레딧 RPC는 기존처럼 유지한다.

### Fix 5 — 쿼리 인덱스 마이그레이션
`migrations/20260711081542_workspace-fast-entry-index.sql`에 `public.musics(user_id, created_at DESC)` 인덱스를 추가했다. 먼저 pending 상태였던 `20260710000000_generation-cost-logs.sql`을 적용한 뒤 workspace 인덱스 migration도 적용했다.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Lint | `npm run lint` | Passed (0 errors, warning 1개: 기존 FullScreenPlayer 장식용 `<img>` 권고) |
| Build/typecheck | `npm run build` | Passed; `/workspace` = `○ Static`, `/api/workspace/bootstrap` = `ƒ Dynamic` |
| Local production shell timing | `npm run start` 후 `curl /workspace` 5회 | 88ms → 1.9ms → 3.2ms → 4.3ms → 1.6ms |
| Unauthorized bootstrap | `curl /api/workspace/bootstrap` without cookies | 401 in 43ms |
| DB migration apply | `npx @insforge/cli db migrations up 20260710000000_generation-cost-logs.sql` + `npx @insforge/cli db migrations up 20260711081542_workspace-fast-entry-index.sql` | Passed |
| DB index verification | `pg_indexes` query | Passed: `generation_cost_logs_*` indexes and `idx_musics_user_id_created_at` exist |

## Lessons
- 음악/크레딧 DB 조회를 뒤로 미뤄도, Proxy/session refresh와 서버 auth 조회가 shell 앞에 남아 있으면 체감 성능은 계속 느릴 수 있다.
- UX 우선 workspace는 optimistic shell + API-level auth가 더 적합하다. 생성/결제/다운로드 같은 mutation API에서 엄격히 확인하면 된다.

---

# RESULT: Lyrics formatting stabilization - 2026-07-11

## Background
가사 입력 경로가 두 가지(사용자 직접 입력, AI Lyrics Assistant/auto lyrics)로 나뉘면서 표시용 원문과 ACE-Step 생성용 정규화본이 달라졌다. 플레이어는 원문 `metadata.lyrics`만 읽어 괄호형 instrumental effect가 가사 줄로 표시되고, approximate highlighter의 줄 수 계산도 함께 어긋났다. 진짜 time-sync/LRC alignment는 후속 작업으로 분리했다.

## Implementation

### Fix 1 — 공통 가사 정규화
`lib/lyrics/format.ts`를 추가해 section tag canonicalization, stage direction 제거, display line 추출을 공유화했다. `(Instrumental break)`, `(beat drops)`, `[Guitar solo]` 같은 편곡/무대 지시는 제거하고, `(oh yeah)`처럼 부를 수 있는 괄호 애드립은 유지한다.

### Fix 2 — 플레이어 표시/타이밍 입력 우선순위
`parseMusicLyrics()`가 `metadata.lyrics_payload`를 우선 읽고, 없을 때만 `metadata.lyrics`로 fallback하도록 변경했다. 표시/타이밍 줄은 공통 정규화기를 거쳐 section tag와 instrumental effect를 제외한다.

### Fix 3 — 생성 payload + AI prompt 강화
`buildLyricsPayload()`도 공통 정규화기를 사용해 ACE-Step에 stage direction이 들어가지 않도록 했다. Lyrics Assistant system prompt에는 parenthetical production note와 inline production note를 lyrics field에 쓰지 말라는 규칙을 추가했다.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 관련 단위 테스트 | `npx vitest run lib/player/lyrics.test.ts lib/music-prompt/buildLyricsPayload.test.ts lib/lyrics-assistant/prompt.test.ts` | Passed (21 tests) |
| 전체 빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors, warning 1개: 기존 FullScreenPlayer 장식용 `<img>` 권고) |

## Lessons
- 현재 highlighter는 true time-sync가 아니라 곡 길이 기반 approximate sync다. 줄 목록에 비가사 지시문이 섞이면 타이밍 오차가 더 커진다.
- 표시용 가사와 생성용 가사를 분리하더라도, 플레이어는 생성에 쓰인 정규화본을 우선 보는 편이 사용자 체감과 더 맞다.

---

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

---

# RESULT: Music Player 버그 수정 5개 - 2026-07-10

## Background
풀스크린 플레이어 5개 버그: 모바일 여백 과다, Prev/Next 미작동, 가사 누락("Instrumental track" 오표시), 가사 하이라이트 오작동, 앨범 커버 생성 직후 미반영.

## Implementation
- Bug 1: 가사 없을 때 lyrics 컨테이너 `flex-1` 제거, `hasLyrics` 분기
- Bug 2: `PlayerControls`에 `onPrev?`/`onNext?` 추가, WorkspaceShell Prev/Next 로직 연결
- Bug 3: `MUSIC_COLUMNS`에 `"metadata"` 추가, bootstrap 최적화 override 제거
- Bug 4: 오디오 엘리먼트 실측 duration 우선 사용
- Bug 5: 폴링 stop 조건에 `thumbnail_status !== "pending"` 추가

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | 0 errors |

## Lessons
- Bootstrap API의 metadata 최적화가 가사/instrumental 플래그 등 UI 로직에 영향
- track.duration_seconds vs 오디오 실측값: null 가능성 있는 DB값보다 onLoadedMetadata 우선

---

# RESULT: Workspace UX Renewal Phase 1+2 - 2026-07-10

## Background
PRD(`la_musica_workspace_ux_prd.md`) + coding guide 기반 워크스페이스 전면 UX 개편.
Phase 1: 기존 987줄 monolith(`music-workspace.tsx`) → 역할별 컴포넌트 분리, 동작 변경 없음.
Phase 2: 새 UX 구현 — 생성 진행 화면, 실패 다이얼로그, 풀스크린 플레이어(가사 하이라이트), 모바일 볼륨 숨김, StatusBadge 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 타입체크/빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors, warning 1개: FullScreenPlayer img→next/image 권고 — 장식용 blur 배경이라 무시) |

---

---

# RESULT: Vercel Cron 연결 + DB 마이그레이션 적용 + Phase 5 - 2026-07-10

## Background
Phase 0~4 완료 후 남은 Follow-up 3개 처리: Vercel Cron 연결, `generation_cost_logs` DB 실제 적용, Phase 5(Short-form duration + 프리셋).

## Implementation

### Vercel Cron 연결
- `vercel.json` 신규: `*/5 * * * *` 스케줄로 `POST /api/internal/reconcile-music` 호출
- `app/api/internal/reconcile-music/route.ts`:
  - 인증 방식 수정: Vercel Cron이 보내는 `Authorization: Bearer <CRON_SECRET>` + 기존 `x-cron-secret` 둘 다 허용
  - `CRON_SECRET`는 Vercel 시스템 변수(자동 주입) — 수동 등록 불필요

### generation_cost_logs DB 적용
- `npx @insforge/cli db import migrations/20260710000000_generation-cost-logs.sql` 실행 → 실제 InsForge DB에 테이블·인덱스 생성 완료

### Phase 5 — Duration 옵션 + 프리셋
- `lib/music.ts`: `GenerateRequest`에 `duration?: number` 필드 추가, `buildAceStepInput()`에 `duration` 파라미터 추가
- `app/api/music/generate/route.ts`: `duration` 파싱(상한 300s 클램프), 비용 로그 수정
- `components/prompt-box.tsx`: Short(1min)/Full(3min) 토글, Football Chant/Meme/Sports Hype 프리셋

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 테스트 | `npx vitest run` | 95 tests passed |
| 타입체크/빌드 | `npm run build` | Passed |
| Lint | `npm run lint` | Passed (0 errors) |

## Lessons
- Vercel `CRON_SECRET`는 시스템 변수라 Vercel UI에서 수동 등록이 막힘 — 배포하면 자동 주입됨.
- InsForge MCP는 Supabase project ref 형식(20자 소문자)만 수락 — InsForge 프로젝트엔 `@insforge/cli db import` 사용.

---

# RESULT: La Musica 리뉴얼 Phase 0~4 - 2026-07-10

## Background
`la_musica_renewal_plan.md` 기반 리뉴얼. 제품 약속(텍스트→노래)과 실제 동작의 불일치 제거, 신뢰성 강화, cost 측정 체계 수립이 목적.

## Implementation

### Phase 0 — 정합성 복구
- `README.md` 전면 재작성: `meta/musicgen` → ACE-Step, Polar 결제, Gemini 보조, credit 플랜 표 추가
- `lib/credits.ts`: Viral Pack 35 → 50 credits (Creator 대비 단가 역전 해소)
- `lib/credits.test.ts` 신규: 4개 테스트

### Phase 1 — Auto Lyrics Generation
- `lib/lyrics-assistant/generateAutoLyrics.ts` 신규: 빈 messages 단일 Gemini 호출
- `lib/lyrics-assistant/generateAutoLyrics.test.ts` 신규: 4개 테스트
- `app/api/music/generate/route.ts`: `lyrics_required` → auto-generate, `lyrics_generation_failed` 502

### Phase 2 — Generation Reliability
- `lib/reconcile-music.ts` 신규: DI 기반 순수 재조정 로직, 7가지 아웃컴, idempotent
- `lib/reconcile-music.test.ts` 신규: 8개 테스트
- `app/api/internal/reconcile-music/route.ts` 신규: CRON_SECRET 검증, 배치 50건
- `app/api/music/[id]/route.ts`: audio_key idempotency, thumbnail fire-and-forget

### Phase 3 — Cost Logging
- `lib/cost-logging.ts` 신규: `buildCostLogRow()`, ACE-Step $0.000178/s, Gemini $0.0001/call
- `migrations/20260710000000_generation-cost-logs.sql` 신규: `generation_cost_logs` 테이블

### Phase 4 — UX
- `components/music-workspace.tsx`: `lyrics_generation_failed` 처리, 상태 메시지 개선
- `components/prompt-box.tsx`: lyrics placeholder 갱신

## Verification
93 tests / build / lint 통과. 서브에이전트 리뷰 Critical/Important 전량 수정.

---

# RESULT: 브랜드 로고 교체 - 2026-07-10

## Background
- 사용자가 확정한 새 로고(보라-파랑 그라디언트 심볼)로 교체하기 위해 프로젝트 상위에 `la_musica_logo_assets_exact/`(favicon, icon/horizontal 라이트·다크 세트, og-image, 사용 가이드)를 준비해둠.
- 기존 `components/logo.tsx`는 손으로 그린 리본 SVG를 `currentColor` 단색 stroke로 그리는 방식이라, 그라디언트가 들어간 새 심볼을 그대로 대체할 수 없었음 — 파일 참조(`<img>`) 방식으로 전환 필요.

## Implementation
- README/logo 교체 완료. 상세는 PLAN.md Done 참조.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Build/lint | npm run build + lint | Passed |

---

# RESULT: 노래 생성 즉시 Pending 피드백 - 2026-07-10

## Background
- 사용자가 Generate 클릭 후 노래 목록에 항목이 2~3초 늦게 뜬다고 보고. 원인은 클라이언트가 `/api/music/generate` 응답을 기다린 뒤에야 `upsertTrack(json.music)`을 호출하는 구조였음.
- 서버 generate route는 응답 전 인증/크레딧 조회, Gemini 번역, 프롬프트 정제, 크레딧 예약 RPC, Replicate prediction 생성, DB update, 남은 크레딧 조회까지 수행하므로 즉시 목록 반영이 불가능했음.
- 사용자 오해("버튼 눌렀는데 생성 안 되나?")를 줄이는 목적에는 API 분리보다 클라이언트 낙관적 pending row가 가장 작은 변경으로 효과가 큼.

## Implementation
- **`components/music-workspace.tsx`**: `handleSend` 시작 즉시 임시 `pending` 트랙(`Starting your track...`)을 목록 맨 위에 추가. 서버 응답 성공 시 임시 row를 실제 DB row로 교체하고 기존 polling 시작.
- generate 실패 시 임시 row 제거 후 기존 에러 UX 유지. `insufficient_credit`은 크레딧 모달을 열고, `lyrics_required`는 가사 필요 메시지를 표시.
- bootstrap 로딩 중 Generate를 눌러도 임시 row가 목록 bootstrap 응답에 덮어써지지 않도록, bootstrap setTracks에서 optimistic row를 보존 후 서버 tracks를 병합.
- 임시 row는 실제 DB id가 아니므로 polling 대상에서 제외하고, track action menu도 disabled 처리.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Optimistic row creation | 코드 확인 | `handleSend` 시작 즉시 temp `pending` track 추가 |
| Success replacement | 코드 확인 | server `json.music`로 temp row 교체 후 poll 시작 |
| Failure cleanup | 코드 확인 | 에러 시 temp row 제거 + 기존 에러/credit modal 처리 |
| Invalid temp server calls 방지 | 코드 확인 | temp row는 polling 제외, action menu disabled |

## Lessons
- 사용자에게 중요한 첫 피드백은 "완성"이 아니라 "접수됨"이다. 긴 서버 준비 단계를 기다리기 전에 pending row를 보여주면 클릭 실패로 오해할 여지가 줄어든다.
- optimistic row는 실제 DB row가 아니므로 polling/rename/delete 같은 서버 액션에서 제외해야 한다.
- bootstrap 후속 로딩과 optimistic UI가 동시에 존재할 수 있으므로, 서버 목록 로드가 임시 row를 지우지 않게 병합 로직이 필요했다.

## Follow-ups (미적용)
- 실제 로그인 세션에서 Generate 클릭 즉시 pending row가 보이고, 2~3초 후 실제 processing row로 교체되는지 브라우저 확인 필요.
- 다음 단계로 PromptBox send 버튼 자체를 request 중 disabled/loading 처리하면 중복 제출 방지도 더 명확해짐.

---

# RESULT: Workspace 스켈레톤 로딩 전환 - 2026-07-10

## Background
- 사용자가 `Open Workspace` 클릭 시 여전히 약 1초가 걸린다고 보고. 배포된 `/workspace`는 비로그인 기준으로도 300~570ms였고, 로그인 상태에서는 서버 인증 확인 뒤 `musics` 50개와 `user_credits` 조회까지 기다린 뒤 HTML/RSC를 내려주는 구조였음.
- Next 16 streaming 문서 확인: `loading.tsx`는 즉시 스켈레톤을 제공하지만, 실제 체감 개선을 위해서는 느린 데이터 접근을 route shell 밖이나 아래 경계로 밀어야 함. 이번 변경은 `/workspace` 서버 렌더에서 사용자 데이터 DB 조회를 제거하고, shell 이후 클라이언트 bootstrap 요청으로 분리.
- 사용자가 "컴포넌트를 하위 컴포넌트로 쪼개면 빨라지나"도 질문. 결론: 단순 파일 분리는 같은 import graph면 초기 번들 감소가 거의 없고, `next/dynamic`/lazy import로 비초기 UI(`CreditModal`, Lyrics Assistant 등)를 뒤로 미룰 때만 초기 로드 개선이 큼.

## Implementation
- **`app/workspace/page.tsx`**: 서버 렌더에서 음악 목록/크레딧 DB 조회 제거. 이제 `getCurrentUser()`로 navbar에 필요한 사용자 표시 정보와 `loadInitialData` 여부만 결정하고 바로 `WorkspaceShell`을 렌더.
- **`app/api/workspace/bootstrap/route.ts`**(신규): 로그인 사용자의 최근 음악 50개와 크레딧을 no-store JSON으로 반환. `musics`는 `select()` 전체 대신 UI에 필요한 컬럼만 명시하고 `metadata`는 빈 객체로 채워 payload를 줄임.
- **`components/workspace-shell.tsx`**: `loadInitialData` prop을 `MusicWorkspace`로 전달.
- **`components/music-workspace.tsx`**: `loadInitialData`가 true면 mount 후 `/api/workspace/bootstrap`을 호출해 tracks/credit을 채움. 로딩 중에는 리스트 영역에 `TrackListSkeleton`을 표시하고, 완료 후 기존 empty/search/result UI로 전환.
- **`app/workspace/loading.tsx`**(신규): route-level 즉시 스켈레톤 추가. navbar/search/avatar/list/prompt composer 자리의 shape를 실제 workspace와 비슷하게 맞춤.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Route table | `npm run build` | `/workspace` dynamic 유지, 신규 `/api/workspace/bootstrap` dynamic |
| Local production shell timing | `npm run start` 후 `/workspace` fetch 5회 | 134ms → 13ms → 9ms → 6ms → 5ms |
| Bootstrap unauthorized path | `npm run start` 후 `/api/workspace/bootstrap` 비로그인 fetch | 401, 5ms → 1ms |
| Data freshness | 코드 확인 | 사용자별 tracks/credit은 no-store bootstrap API에서 최신 조회 |

## Lessons
- 스켈레톤 자체보다 더 중요한 것은 "무엇을 기다리지 않게 만들었는가"다. 이번에는 목록/크레딧 DB 조회를 shell 이후로 밀어 첫 화면을 빠르게 했다.
- 단순 컴포넌트 분리는 성능 최적화가 아니다. 같은 route에서 정적 import되면 같은 클라이언트 번들에 들어가므로, 실제 초기 JS 감소는 lazy/dynamic import가 필요하다.
- `select()` 전체 조회는 편하지만 초기 workspace payload를 키울 수 있다. UI에 필요한 컬럼만 선택하고 metadata를 제외해 bootstrap 응답을 가볍게 유지했다.

## Follow-ups (미적용)
- 실제 로그인 세션으로 브라우저에서 `Open Workspace` 클릭 → 스켈레톤 → 목록 채움 흐름을 확인 필요.
- 다음 성능 후보: `CreditModal`, Lyrics Assistant, 일부 고급 prompt UI를 `next/dynamic`으로 lazy load해 초기 workspace JS를 더 줄이기.

---

# RESULT: 랜딩 페이지 전환 성능 개선 - 2026-07-10

## Background
- 사용자가 페이지 이동이 매우 느리다고 보고. 로컬 측정 결과 `/`는 warm 상태에서도 약 180~200ms였고, 원인은 랜딩 페이지가 `cookies()`/`getCurrentUser()`와 InsForge 샘플 트랙 조회를 서버 렌더 경로에서 매번 기다리는 구조였음.
- Next 16 문서 확인: 페이지/레이아웃 상단에서 `cookies()`나 데이터 fetch를 `await`하면 아래 정적 shell 전체가 동적 렌더에 묶임. Turbopack root도 상위 `/Users/jeongwonkim`로 추정되는 경고가 있어 dev 첫 요청이 불필요하게 느려질 수 있었음.
- 사용자가 랜딩 정적화 시 새 노래 목록/생성 결과 신선도 문제를 우려. `/workspace`의 사용자별 음악 목록과 크레딧 조회는 그대로 동적 유지하고, 랜딩의 고정 featured 샘플만 1시간 ISR 캐시로 전환하기로 결정.
- 인라인 스타일 여부도 확인: 전체 UI는 Tailwind 클래스 기반이며, `style=` 직접 사용은 히어로 마스크/WebGL 최소 높이/Logo display/body scroll lock/textarea auto-height 같은 제한적 예외만 있음. 사이트 전체가 인라인 스타일 기반으로 제작된 것은 아님.

## Implementation
- **`app/page.tsx`**: 서버 인증 확인(`cookies()` + `getCurrentUser()`) 제거. 랜딩은 `revalidate = 3600`으로 1시간 ISR 정적 응답이 되도록 변경. CTA는 클라이언트에서 로그인 상태를 늦게 반영.
- **`components/auth-aware-get-started-badge.tsx`**(신규): 랜딩 CTA가 처음에는 `/auth`/`Get Started`로 렌더되고, hydration 후 `/api/auth/status`가 authenticated를 반환하면 `/workspace`/`Open Workspace`로 갱신. 모듈 단위 promise 캐시로 한 페이지의 여러 CTA가 같은 status 요청을 공유.
- **`app/api/auth/status/route.ts`**(신규): 쿠키 세션을 읽어 `{ authenticated }`만 반환하는 no-store route. 랜딩 HTML 렌더를 막지 않고 CTA 라벨만 사후 갱신.
- **`components/headersection.tsx`, `components/herosection.tsx`, `components/cta-section.tsx`**: `authAwareCta` 옵션 추가. 랜딩에서만 auth-aware CTA를 사용하고 다른 페이지의 기존 `ctaHref` 흐름은 유지.
- **`app/workspace/page.tsx`**: 로그인 후 `musics` 목록 조회와 `user_credits` 조회를 `Promise.all`로 병렬화. `/workspace` 자체는 계속 동적 서버 렌더.
- **`next.config.ts`**: `turbopack.root = process.cwd()` 설정으로 dev 서버의 상위 lockfile 기반 root 추정 경고 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 랜딩 정적화 여부 | `npm run build` route table | `/` = `○`, Revalidate `1h`; `/workspace` = `ƒ` dynamic 유지 |
| Typecheck/build | `npm run build` | Passed |
| Lint | `npm run lint` | Passed |
| Dev root 경고 | `npm run dev` | Turbopack root warning 사라짐 |
| Production response timing | `npm run start` 후 Node fetch 3회 | `/` 99ms → 5ms → 5ms, `x-nextjs-cache=HIT`; `/api/auth/status` 7ms → 2ms → 1ms |
| Workspace freshness guard | build route table + 코드 확인 | `/workspace`는 정적화하지 않음, 사용자별 목록/크레딧은 동적 조회 유지 |
| 인라인 스타일 조사 | `rg -n "style=|\\.style\\.|<style"` | Tailwind 중심. 제한적 예외: body scroll lock, textarea auto-height, hero WebGL mask/minHeight, logo display block |

## Lessons
- “랜딩 정적화”와 “사용자 데이터 캐시”는 분리해야 한다. 이번에는 고정 featured 샘플만 ISR로 두고, `/workspace`는 계속 동적으로 남겨 사용자 생성 목록/크레딧 신선도를 보존했다.
- 로그인 상태에 따른 CTA 문구는 페이지 HTML을 막지 않아도 된다. 서버 렌더를 기다리는 대신, 클라이언트에서 사후 갱신하면 첫 화면 응답을 빠르게 유지할 수 있다.
- dev 모드 첫 요청 수치는 컴파일 영향을 크게 받는다. 실제 체감 판단에는 `next build` + `next start`에서 cache header와 반복 요청을 함께 확인하는 편이 더 정확하다.

## Follow-ups (미적용)
- 랜딩 footer의 `Create` 링크는 정적 `/auth`로 남아 있음. 로그인 사용자가 누르면 `/auth`에서 `/workspace`로 리다이렉트되므로 기능 문제는 없지만, footer까지 즉시 `/workspace`로 바꾸려면 auth-aware footer link 컴포넌트를 별도로 추가할 수 있음.
- `/api/auth/status` 첫 요청은 dev 모드에서 route compile 때문에 한 번 44s가 나왔으나, production에서는 1~7ms. 배포 후 실제 브라우저에서 CTA 라벨 전환 체감을 확인하면 좋음.

---

# RESULT: 신규 가입 무료 크레딧 1개 → 5개 인상 - 2026-07-10

## Background
- 위 버그 수정 배포 후 실제 재현 테스트: 문제의 계정(`wjddnjs0419@hufs.ac.kr`, 크레딧/음악/결제 이력 없는 테스트 계정)을 `auth.user_providers`+`auth.users`에서 직접 삭제 후 재로그인 → **정상적으로 크레딧 지급 확인**. 즉 직전 수정으로 실제 문제 해결됨(근본 원인이 admin 클라이언트 쪽이었는지, 단순히 `{error}` 무시 케이스였는지는 여전히 미확정이지만 현재는 정상 동작).
- 사용자 질문: "모델 변경했으니 크레딧 몇 개 줘도 될까?" → Replicate API로 이 프로젝트의 실제 프로덕션 prediction 기록을 직접 조회해 원가 비교:
  - MiniMax music-2.6(구): $0.15 flat/output (Replicate 모델 페이지 표기)
  - ACE-Step 1.5(신): $0.000975/sec × GPU 시간(Nvidia L40S), 실제 프로덕션 180초 트랙 8건 평균 predict_time ~33초 → **곡당 ~$0.032**
  - 곡당 원가가 약 4.7배 저렴해짐 → 사용자가 "5개로 가자" 결정(5개 지급 원가 ~$0.16으로 기존 MiniMax 1개 지급 원가와 비슷한 수준).

## Implementation
- **`migrations/20260709181934_increase-free-signup-credit.sql`**(신규): `grant_free_credit` 함수를 `CREATE OR REPLACE`로 재정의, `INSERT ... VALUES (p_user_id, 1)` → `VALUES (p_user_id, 5)`. 기존 멱등 로직(`ON CONFLICT (user_id) DO NOTHING`)·권한(`project_admin`만 EXECUTE)은 그대로 유지.
- **`app/api/auth/callback/route.ts`**: 주석의 "(1 song)" → "(5 songs)"로 갱신(동작 코드는 변경 없음, `grantFreeCreditSafely` 그대로 사용).
- **`docs/credit-coupons.md`**: "grants one free credit on signup" → "grants five free credits on signup"로 갱신.
- **범위 밖**: 쿠폰(`redeem_credit_coupon`) 지급량은 이번 변경과 무관, 그대로 둠. `components/credit-modal.tsx`의 쿠폰 성공 메시지는 서버가 반환하는 실제 `creditsGranted` 값으로 이미 동적 처리되어 있어 수정 불필요.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| ACE-Step 실제 원가 산정 | Replicate `/v1/predictions` API로 이 계정의 실제 최근 24시간 `duration=180` 실행 8건 predict_time 조회 | 평균 ~33초 → ~$0.032/곡 |
| 마이그레이션 적용 후 함수 본문 확인 | `db query "SELECT prosrc FROM pg_proc WHERE proname='grant_free_credit'"` | `VALUES (p_user_id, 5)` 확인 |
| Full suite | `npx vitest run` | 70 passed (11 files, 회귀 없음) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| 실제 재로그인으로 크레딧 지급 재현 확인 | 테스트 계정 삭제 → 재로그인 | 지급 정상 확인(사용자 보고) — 단, 이 계정 삭제/재로그인은 "1개" 지급 시절 수정 검증이었고, 5개 반영 후 재확인은 아직 미실행 |

## Lessons
- 모델 교체처럼 원가 구조가 바뀌는 변경은 관련 정책 상수(무료 크레딧 개수 등)도 함께 재검토 대상이 된다 — 원가 절감분을 그대로 남겨두면 (의도치 않게) 과도하게 보수적인 정책이 남을 수 있음.

## Follow-ups (미적용)
- 5개 지급 반영 후 실제 재로그인 재현 테스트는 미실행(배포 직후라 확인 필요).
- 콘솔 로그가 아닌 영속 저장소에 실패를 남기는 개선(위 이슈에서 이월)은 계속 범위 밖.

---

# RESULT: 신규 가입 무료 크레딧 미지급 버그 진단·수정 - 2026-07-10

## Background
- Report: "우리 현재 구글로 로그인하면 자동으로 크레딧 지급되게 되어있나?" → 코드상 `app/api/auth/callback/route.ts`가 로그인마다 `grant_free_credit` RPC를 호출하도록 되어 있음을 확인.
- 이어서 사용자가 "오늘 내 친구들이 로그인 처음 했을때 자동 지급되지 않았어"라고 실제 버그를 보고 → `insforge-debug` 스킬로 실측 진단.
- InsForge `insforge.logs`/`postgREST.logs`를 07-08 19:09~07-09 17:52 구간(친구 2명의 실제 로그인 시각 포함, 다른 유저 로그인 다수 포함)에서 조회한 결과 **`grant_free_credit` RPC 호출이 단 한 건도 없음**을 확인 — 친구 2명만의 문제가 아니라 프로덕션에서 자동 지급이 전면적으로 작동하지 않고 있었음. 친구 2명이 현재 보유한 크레딧(14, 19)은 `payments` 원장에 기록이 없고 `POST /rawsql` 호출 직후 값이 찍힌 것으로 보아 자동 지급이 아닌 수동 SQL 개입으로 추정.
- 코드 검사 결과, `@insforge/sdk`의 `database.rpc()`는 Supabase postgrest-js 기반이라 실패해도 throw하지 않고 `{ data, error }`를 반환하는데, 기존 콜백 코드는 반환값을 전혀 확인하지 않고 버렸음 — RPC가 실패해도 `catch`도 `console.error`도 절대 발동하지 않는 구조. Vercel 함수 로그 보존 기간이 짧아 실제 사건 발생 시점(07-09 16:01~16:02 UTC)의 예외 메시지는 확보하지 못함(원인 100% 확정은 아님, 재발 시 진단 가능하도록 개선).

## Implementation
- **`lib/grantFreeCredit.ts`**(신규): `grantFreeCreditSafely(admin, userId)` — RPC 호출 후 `{ error }`를 명시적으로 체크해 실패 시 반드시 `console.error`로 로그, 예외 발생 시에도 캐치해 로그 후 `{ granted: false }` 반환(로그인 흐름은 절대 막지 않음). 성공 시 `data.status === "granted"` 여부로 실제 신규 지급 여부 판별.
- **`app/api/auth/callback/route.ts`**: 기존 `await admin.database.rpc("grant_free_credit", ...)` 무시 호출을 `await grantFreeCreditSafely(admin, userId)`로 교체.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `grantFreeCreditSafely` 성공/스킵/에러/예외 4케이스 | `vitest lib/grantFreeCredit.test.ts` RED→GREEN | Passed (4 new) |
| 콜백 라우트 타입 정합성(`PromiseLike` 반환 타입 정정) | `npm run build`(TypeScript) | Passed |
| Full suite | `npx vitest run` | 70 passed (11 files) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| 실제 프로덕션 재현(로그인 → InsForge 로그에서 grant_free_credit 재확인) | 미실행 — 이 환경에 브라우저/OAuth 자동화 불가 | **배포 후 사용자 확인 필요** |
| Vercel 프로덕션 env(`INSFORGE_API_KEY`/`INSFORGE_URL`) 실값 검증 | `vercel env pull`은 CLI 권한상 값이 항상 빈 문자열로 마스킹되어 실패 | **미확인 — 필요시 Vercel 대시보드에서 직접 확인 필요** |

## Lessons
- Supabase 계열 postgrest-js 기반 SDK의 `.rpc()`/`.from()`는 실패해도 throw하지 않고 `{ data, error }`를 반환한다 — `await`만 하고 반환값을 버리면 실패가 코드상 완전히 무음 처리된다. RPC/쿼리 빌더 호출은 항상 `{ data, error }`를 구조분해해 `error`를 확인해야 함.
- 실패가 무음 처리되는 코드는 "에러 로그가 없다"는 사실만으로는 무죄를 증명할 수 없다 — 서버(InsForge) 요청 로그에 호출 자체가 아예 안 잡히는지까지 함께 봐야 "실패했다" vs "시도조차 안 했다"를 구분할 수 있었음.
- Vercel 함수 런타임 로그는 보존 기간이 짧아(이번 세션에서 `--since`로 어제 시각을 요청해도 최근 ~1분치만 반환됨) 사후 정확한 예외 메시지 확보가 불가능할 수 있다 — 이번처럼 콘솔 로그에만 의존하는 에러 처리는 사후 진단이 어려우므로, 중요한 실패는 DB 등 영속 저장소에 남기는 편이 낫다(이번엔 범위 밖으로 남김).
- `vercel env pull`은 이 세션의 인증/권한 범위에서는 민감 변수 값을 전부 빈 문자열로 반환했다 — 값 존재 자체(`env ls`)는 확인 가능해도 실제 값 검증에는 못 씀. 프로덕션 env 실값 확인이 필요하면 Vercel 대시보드 직접 접근이 필요.

## Follow-ups (미적용)
- 실패를 콘솔 로그가 아닌 영속 저장소(예: 간단한 `app_errors` 테이블)에 남기는 개선은 범위 밖으로 미룸 — 이번 수정은 "에러가 최소한 로그에는 찍히게" 하는 데까지만 함.

---

# RESULT: MiniMax → ACE-Step 음악 생성 모델 전환 - 2026-07-10

## Background
- Report: "노래 생성 왜이렇게 오래 걸리는건지 판단해봐" → 조사 결과 `minimax/music-2.6`(자기회귀 모델)이 곡당 2~4분(최대 6분) 걸리는 게 주 원인으로 확인.
- 사용자 확인 후 방향 결정: "ACE-Step으로 가보자 minimax는 그냥 없애자" — dual-model/fallback 없이 완전 교체.
- 브레인스토밍 중 실제 Replicate API를 직접 호출해 스펙 문서의 가정을 검증: (1) `fishaudio/ace-step-1.5`는 커뮤니티 모델이라 `model` 이름이 아닌 `version` 해시 고정이 필수(실측: `model`로 시도 시 422/404), (2) 입력 필드는 `tags`가 아니라 `prompt`(최대 ~512자, MiniMax의 2000자보다 훨씬 짧음), (3) `lyrics` 필드는 비워두면 리터럴 기본값 `"[Instrumental]"`로 무보컬 처리되어 MiniMax처럼 모델이 가사를 즉석 생성해주지 않음 — 사용자에게 확인 후 "가사 없는 보컬 요청은 400으로 거부"로 결정. 실제 20초 트랙 생성(한국어 가사 포함)을 2회 실제 실행해 predict_time ~6초, 출력 shape(mp3 URL 배열)이 MiniMax와 동일함을 확인.

## Implementation
- **`lib/music.ts`**: `MINIMAX_MODEL` → `ACE_STEP_MODEL`("fishaudio/ace-step-1.5") + 신규 `ACE_STEP_VERSION`(예측 생성 시 `version`으로 전달, 실측 필수) + `ACE_STEP_DURATION_SECONDS`(180초 고정, UI 변경 없음). `MAX_PROMPT_CHARS` 2000→500(ACE-Step 스키마 한도에 맞춤). `buildMinimaxInput` → `buildAceStepInput`: `is_instrumental` 불리언 없이 `lyrics: "[Instrumental]"` 리터럴로 무보컬 신호.
- **`lib/refineStylePrompt.ts`**: 정제 결과 길이 한도를 2000→500자로 축소(compileMusicPrompt 자체의 2000자 클램프는 그대로 — refine 단계가 ACE-Step 한도에 맞춰 한 번 더 압축). Gemini system instruction에 "400자 이내" 명시 목표 추가.
- **`lib/music-prompt/buildMusicPrompt.ts`**: `LYRICLESS_VOCAL_GUIDANCE`(가사 없는 보컬 요청 시 모델이 알아서 가사를 짓게 하던 문구) 데드코드 제거 — 이제 라우트가 상류에서 차단하므로 도달 불가능한 분기였음.
- **`app/api/music/generate/route.ts`**: `compileMusicPrompt` 직후 `!compiled.instrumental && !lyrics` 검증 추가 → `lyrics_required`(400), refine 호출·크레딧 차감 전에 거부. Replicate 호출을 `predictions.create({ version: ACE_STEP_VERSION, input: buildAceStepInput(...) })`로 교체, `p_model`도 `ACE_STEP_MODEL`로 교체.
- **`components/music-workspace.tsx`**: `lyrics_required` 에러 코드에 대한 친절한 메시지("Add lyrics for vocal tracks, or switch to Instrumental.") 추가(기존 `insufficient_credit` 패턴과 동일).
- **문서**: `docs/MINIMAX_PROMPT_ENGINEERING.md` → `docs/ACE_STEP_PROMPT_ENGINEERING.md`로 rename 후 모델/필드/한도 섹션 재작성, `docs/chatgpt-project/*.md` 4개 파일의 MiniMax/`is_instrumental` 언급을 ACE-Step 사실로 갱신, `lib/translatePrompt.ts`·`lib/music-prompt/buildLyricsPayload.ts`의 주석도 정리.
- **범위 밖(의도적)**: duration UI 노출(고정값 유지), MiniMax fallback/feature flag(완전 제거가 목표), 프리셋 재튜닝(그대로 재사용).

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `buildAceStepInput`(프롬프트/가사 클램프, `[Instrumental]` 처리) | `vitest lib/music.test.ts` RED→GREEN | Passed (4 new + 3 기존) |
| `finalizeRefined` 500자 클램프 | `vitest lib/refineStylePrompt.test.ts` RED→GREEN | Passed (8) |
| `LYRICLESS_VOCAL_GUIDANCE` 제거 후 회귀 없음 | `vitest lib/music-prompt/buildMusicPrompt.test.ts` RED→GREEN | Passed (11) |
| 실제 ACE-Step 예측 (스파이크: 20초 영어 트랙) | `curl` 직접 호출 + `afinfo` 길이 검증 | 성공, 20.04초 mp3, predict_time 6.1s |
| 실제 ACE-Step 예측 (route 배선 검증: 한국어 가사 보컬 트랙) | `buildAceStepInput` 실사용 출력으로 `curl` 예측 생성 | 성공, mp3 URL 반환 |
| Full suite | `npx vitest run` | 66 passed (10 files) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| 남은 라이브 코드 레퍼런스 | `grep -rn "MINIMAX_MODEL\|buildMinimaxInput\|minimax/music"` | 주석 1건(의도적 비교 설명)만 남음 |
| 브라우저 UI 실사용(로그인 → 실제 생성 → 재생) | 미실행 — 이 환경에 브라우저 자동화 도구 없음 | **사용자 확인 필요** |
| Prod 커밋/배포 | main에 직접 커밋 완료(사용자 승인), 배포는 사용자 | Pending(배포는 사용자) |

## Lessons
- Replicate 커뮤니티 모델(공식 모델과 달리 `owner/name` 뒤에 자동 배포 HTTP API가 없는 모델)은 `model` 이름만으로 예측을 만들 수 없고 `version` 해시 고정이 필요하다는 걸 문서만으로는 알 수 없었음 — 실제 API 호출(모델 OpenAPI 스키마 조회 + 실제 예측 1회)로 검증하고 나서야 정확한 배선 방법을 확정할 수 있었다. 마케팅 페이지/블로그 스크레이핑 정보는 필드명조차 틀릴 수 있음(`tags`로 알려졌던 필드가 실제로는 `prompt`).
- 모델 교체 시 "동등해 보이는" 필드도 세부 동작이 다를 수 있다 — MiniMax는 가사 없이도 보컬 트랙에 즉석 가사를 지어줬지만 ACE-Step은 그 기능이 없어 조용히 무보컬로 렌더링될 뻔했다. 이런 회귀는 스펙 단계에서 실제 스키마를 살펴보다가 우연히 발견했는데, 발견하지 못했다면 배포 후에야 "보컬 선택했는데 왜 인스트루멘털이 나오지" 버그로 드러났을 것.
- 계획서(writing-plans) 작성 시 "테스트 파일이 없다"고 가정했던 `lib/music.test.ts`가 실제로는 이미 `resolveRenameTitle` 테스트를 담고 있었음 — Write 툴이 기존 파일 존재를 감지해 막아준 덕에 실행 단계에서 발견·수정(덮어쓰기 대신 추가). 계획 문서의 파일 존재 가정은 실행 직전에 다시 확인하는 게 안전.

## Follow-ups (미적용)
- **브라우저에서 실제 로그인 → 생성 → 재생 플로우 확인 필요** — 이 세션은 curl 레벨 실제 API 검증(2회 성공)과 build/lint/vitest 통과까지만 확인했고, `npm run dev` + UI 클릭 스모크 테스트는 브라우저 자동화 도구가 없어 수행하지 못함.
- Duration 180초 고정값이 실제 사용자 체감에 적절한지(너무 짧다/길다) 피드백에 따라 조정 여지.
- ACE-Step 출력 음악 품질이 MiniMax 대비 실사용에서 어떤지(장르별 편차 등) 프로덕션 트래픽으로 관찰 필요.

---

# RESULT: Gemini 무료티어 RPM 경합으로 인한 동시 사용 실패 수정 - 2026-07-10

## Background
- Report: "lyrics assistant 지금 동시에 3명 사용하니까 안되네" — 동시 사용자 3명이면 AI 가사 어시스턴트가 실패.
- 원인 조사: `GEMINI_API_KEY` 하나를 title 생성(`lib/musicTitle.ts`) · 번역(`lib/translatePrompt.ts`) · 스타일 정제(`lib/refineStylePrompt.ts`) · 가사 어시스턴트(`lib/lyrics-assistant/prompt.ts`) 4곳이 공유. 무료티어 한도(`gemini-2.5-flash-lite`, 15 RPM, 프로젝트 단위)를 곡 생성 1건(번역+정제+제목=최악 3콜)과 가사 어시스턴트 채팅이 함께 나눠 쓰다 보니 동시 사용자 소수만으로도 429에 부딪힘. 그 중 `generateLyrics`(가사 어시스턴트)는 타임아웃·재시도가 전혀 없어 429를 즉시 `gemini_failed`로 노출.
- 사용자 확인 후 범위 확정: (1) 곡 생성 1건당 Gemini 호출 수 자체를 줄이고, (2) 남는 호출에 429 재시도 + 타임아웃을 추가.
- 후속 결정: 처음엔 정제+제목 생성을 한 Gemini 콜로 합쳤으나, 사용자가 "제목은 Gemini 호출로 아예 생성하지 말자"고 확정 → 제목은 항상 로컬 휴리스틱(`buildFallbackMusicTitle`)만 사용하는 것으로 최종 변경. 곡 생성당 Gemini 호출이 항상 번역+정제(최대 2콜)로 고정됨.

## Implementation
- **`lib/geminiFetch.ts`(신규)**: `fetchGeminiWithRetry()` — 3개 호출부(번역/정제/가사 어시스턴트)가 공유하는 fetch 래퍼. 시도마다 `AbortController` 타임아웃(기본 8s), 429/503 응답은 `Retry-After` 헤더(있으면 우선) 또는 지수 백오프로 최대 2회 재시도 후 포기. 일반 `fetch`와 동일한 계약(성공/비-ok Response 반환, 소진 시 throw)이라 호출부 diff가 최소화됨.
- **`lib/translatePrompt.ts`, `lib/refineStylePrompt.ts`, `lib/lyrics-assistant/prompt.ts`**: 각자의 `fetch(...)` 호출을 `fetchGeminiWithRetry(...)`로 교체. `refineStylePrompt`는 기존 수동 `AbortController`/`setTimeout`을 걷어내고 `timeoutMs` 옵션으로 위임.
- **`lib/musicTitle.ts`**: 자체 Gemini 콜을 쓰던 `generateMusicTitle()`을 완전히 삭제. 제목은 이제 항상 순수 함수 `buildFallbackMusicTitle()`(가사 훅 라인 → 없으면 genre/mood 기반)만 사용, Gemini 호출 경로 없음. `deriveTitleFromLyrics`/`sanitizeGeneratedTitle`/`formatGenreLabel`/`formatMoodLabel` 등 순수 헬퍼는 유지(다른 라우트에서도 재사용 중).
- **`app/api/music/generate/route.ts`**: 제목은 `buildFallbackMusicTitle()`로 곧장 계산(Gemini 호출 없음), 정제는 `refineStylePrompt()` 단독 호출. (중간에 정제+제목을 한 콜로 합치는 `lib/refineStyleAndTitle.ts`를 만들었었지만, 제목 자체를 Gemini로 만들지 않기로 하면서 불필요해져 삭제 — 곡 생성 흐름은 `compile → refineStylePrompt → MiniMax`로 단순화.)
- 결과: 곡 생성 1건당 Gemini 호출이 항상 번역(비영어일 때만)+정제 = **최대 2콜**로 고정(이전 최악 3콜 대비 감소, 제목 관련 변동성 제거). 남은 모든 호출(번역/정제/가사 어시스턴트)이 429에 자동 재시도.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `fetchGeminiWithRetry` (429 재시도/백오프/Retry-After/타임아웃/논리트라이어블/네트워크실패) | `vitest geminiFetch.test.ts` RED→GREEN | Passed (6) |
| `translateToEnglish` 429 재시도 | `vitest translatePrompt.test.ts` RED→GREEN | Passed |
| `refineStylePrompt` 429 재시도 (+ 기존 finalizeRefined 회귀 없음) | `vitest refineStylePrompt.test.ts` RED→GREEN | Passed (8) |
| `generateLyrics` 429 재시도 | `vitest lyrics-assistant/prompt.test.ts` RED→GREEN | Passed (2) |
| Full suite | `npx vitest run` | 62 passed (10 files) |
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| Prod deploy | 사용자가 직접 커밋/푸시/배포 | Pending(사용자) |

## Lessons
- 여러 기능이 **같은 무료티어 API 키의 RPM 예산을 공유**하면, 각 기능이 개별적으로는 "실패 시 폴백"이라 안전해 보여도 합산 호출 빈도가 한도를 넘는 순간 전부 동시에 흔들린다 — 호출부마다 개별 방어(타임아웃/재시도)를 넣는 것과 별개로, 애초에 호출 횟수 자체를 줄일 여지가 있는지 먼저 봐야 함.
- 호출을 "합치는" 것보다 "아예 없애는" 게 가능하면 그게 낫다 — 제목 생성처럼 로컬 휴리스틱으로 충분히 대체 가능한 Gemini 호출은 합치기보다 제거가 근본적인 해결.
- 재시도 래퍼는 일반 `fetch`와 동일한 반환/예외 계약을 유지하면 호출부 diff를 최소화할 수 있다(기존 `if (!res.ok)`/`catch` 로직 그대로 재사용 가능).

## Follow-ups (미적용)
- 무료티어 자체 RPM 상향(유료 Tier 1, 150~300 RPM)은 코드 변경이 아니라 사용자의 과금 결정 사항 — 트래픽이 계속 늘면 고려.
- 폴백률/429 발생 빈도 모니터링: 이번 변경 이후 실제 동시 사용 환경에서 재시도로 얼마나 해소되는지 실측 필요(관측 로그 없음).
- 로컬 휴리스틱 제목 품질이 Gemini 생성 제목보다 낮을 수 있음 — 사용자 피드백에 따라 재검토 여지.

---

# RESULT: Workspace mobile scroll stability - 2026-06-18

## Background
- Request: The AI Lyrics Assistant in the workspace felt poorly optimized on mobile, with strange dragging/scroll behavior.
- Follow-up: Before fixing only that modal, inspect the rest of the workspace for the same mobile scroll risk.

## Implementation
- **`components/lyrics/LyricsAssistantModal.tsx`**: moved the assistant modal into a `document.body` portal, locked body scroll while open, switched the mobile sheet to `100dvh`, and constrained scrolling to the modal body with `min-h-0` and `overscroll-contain`.
- **`app/workspace/page.tsx`** and **`components/music-workspace.tsx`**: changed the workspace shell to a fixed `100dvh` flex viewport and added `min-h-0` / `overscroll-contain` to the track-list scroll container.
- **`components/credit-modal.tsx`**: added body scroll lock, `100dvh` overlay sizing, and an internal scrollable dialog so the pricing cards plus coupon form do not get clipped on short mobile screens.
- **`components/prompt-box.tsx`**: capped the lyrics textarea and options panel height on mobile so expanding composer controls cannot take over the workspace.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |

## Lessons
- Workspace mobile stability depends on the whole scroll chain: root viewport height, flex children, modal portals, and body scroll locking need to agree.
- The in-app Browser was unavailable in this session, so visual mobile QA still needs a quick manual pass on `http://localhost:3000/workspace`.

# RESULT: 정제 전/후 프롬프트 효과 실측 + 저작권 중복·타임아웃 수정 - 2026-06-17

## Background
- 직전 작업(Gemini style 정제) 후속: `musics.metadata` 의 `compiled_music_prompt`(정제 전) vs `final_music_prompt`(정제 후) 실데이터로 정제 효과 실측 요청.
- 실측에서 결함 2건 발견 → 함께 수정.

## 실측 결과 (InsForge SQL, n=6 = 메타에 정제 전/후 둘 다 있는 전체 행)
| id | 모드 | 전(자) | 후(자) | 비율 | 폴백 |
|---|---|---|---|---|---|
| 8c05025b | vocal | 1463 | 798 | 55% | - |
| dae6b5e5 | vocal | 1010 | 711 | 70% | - |
| 040377ae | vocal | 975 | 715 | 73% | dup |
| dfd4c3a3 | vocal | 912 | 780 | 86% | dup |
| 1d68a057 | instrumental | 337 | 337 | 100% | fallback |
| e4300386 | vocal | 896 | 896 | 100% | fallback |

- **정제 양성**: 정제 4건 평균 ~30% 압축(산문 comma-soup → 밀도 descriptor 리스트). 컴파일엔 없던 **BPM/key 보강**("100 BPM, F minor", "128 BPM, C minor").
- **결함① 폴백 33%(2/6)**: before==after. Gemini 에러/타임아웃/무료티어 RPM 경합. 타임아웃 가드 부재.
- **결함② 저작권 중복(2/4 정제건)**: Gemini 가 저작권 문구를 의역하면 `finalizeRefined` 의 정확일치 검사를 통과 못해 캐논 재부착 → 이중 꼬리(토큰 낭비).

## Implementation
- **결함②(`lib/refineStylePrompt.ts`)**: `finalizeRefined` 재작성 — 캐논 `COPYRIGHT_LINE` 부분문자열 먼저 제거(내부 콤마 때문에 naive 콤마 split 시 "song"/"melody" 고아 파편 발생) → 잔여 절을 콤마 분리 후 `/imitate|copyright|original composition/i` 매칭 절 제거 → 캐논 1회만 부착. strip 후 음악적 내용 없으면 폴백. system prompt 도 "저작권 절 출력하지 말 것(자동 부착)"으로 변경해 소스에서 차단.
- **결함①(동 파일)**: `refineStylePrompt` 에 `AbortController` + 8s 타임아웃(`REFINE_TIMEOUT_MS`), `signal` 전달, `finally` 에서 `clearTimeout`. 타임아웃 시 기존 catch 가 compiled prompt 폴백.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| finalizeRefined 저작권 중복/고아/폴백 | `vitest refineStylePrompt.test.ts` RED(3 fail)→GREEN | Passed |
| Full suite | `npx vitest run` | 49 passed (8 files) |
| Lint | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| Prod deploy | 사용자가 직접 커밋/푸시/배포 | Pending(사용자) |

## Lessons
- 캐논 문구처럼 **내부 콤마를 가진 문자열**은 콤마 split 전에 부분문자열로 먼저 제거해야 고아 파편이 안 남음.
- LLM 안전문구는 정확일치 검사 불가 — 의역까지 키워드 매칭으로 strip 후 결정적 1회 부착이 안전.
- 실데이터 실측이 코드 리뷰로 안 보이던 폴백률(33%)·중복 버그를 드러냄. 메타에 전/후 둘 다 저장한 설계가 측정 가능하게 함.

## Follow-ups (미적용)
- 폴백률 모니터링: 타임아웃 추가 후에도 폴백 비율 재측정(무료티어 RPM 경합이 주원인이면 타임아웃만으론 미해결).
- 언어 선택 UI 드롭다운(`GenerateRequest.language` 실제 전송).

---

# RESULT: HelloTalk beta coupon credits - 2026-06-18

## Background
- Request: Give selected HelloTalk testers 1 free song credit through a limited invite code, without giving every new signup an automatic free credit.
- Decision: Keep all credit mutation server-side in Postgres, expose only an authenticated redemption API, and seed `HELLOTALK-BETA` as a 20-use coupon.

## Implementation
- **`migrations/20260617185555_credit-coupons.sql`**: added `credit_coupons`, `credit_coupon_redemptions`, normalized uppercase coupon codes, unique `(coupon_id, user_id)` redemption protection, RLS with no public table access, and `redeem_credit_coupon(input_code text)`.
- **Atomic redemption**: the RPC locks the coupon row with `FOR UPDATE`, checks active/start/expiry/sold-out/already-used states, grants `user_credits`, increments `redeemed_count`, writes a redemption row, and records a `public.payments` ledger row with `provider='coupon'` and `status='redeemed'`.
- **Seed coupon**: migration inserted `HELLOTALK-BETA` with `source='hellotalk'`, `credit_amount=1`, `max_redemptions=20`, active immediately, and a 7-day expiry from migration apply time.
- **`app/api/credits/redeem-coupon/route.ts`**: added authenticated `POST /api/credits/redeem-coupon` with body validation and stable error codes.
- **`components/credit-modal.tsx`** and **`components/workspace-shell.tsx`**: added a small "Have a beta code?" redemption UI in the Upgrade modal and refreshed the workspace credit count after success.
- **`app/api/auth/callback/route.ts`** and **`.env.example`**: disabled automatic signup/login free credits by default; legacy behavior only runs with `ENABLE_SIGNUP_FREE_CREDIT=true`.
- **`docs/credit-coupons.md`**: documented HelloTalk coupon SQL, usage checks, extension, and disable commands.

# RESULT: Style prompt 정제(Gemini) + 가사 태그 동기화 + rename/delete UI 수정 + 가사 인증 쿠키 persist - 2026-06-17

## Background
- ChatGPT Project 로 수동 정제하던 "사용자 프롬프트 → 응집된 style 프롬프트" 흐름을 앱에 직접 이식해 MiniMax 음악 퀄 개선이 목표.
- 기존 `compileMusicPrompt` 는 프리셋을 기계적으로 comma 연결만 함("comma soup"). MiniMax 가 그대로 받음.
- 확정 결정(질문 통해): 정제기는 **컴파일된 템플릿 결과(프리셋 포함)를 통째로 재료로 받아 재작성**(옵션 A — 프리셋=가드레일). 번역과 정제는 **별도 Gemini 콜**로 분리. 기존 Gemini 무료티어 재사용(새 API 불필요).
- 부수 발견·수정: 가사 어시스턴트 태그가 코드 정규화 테이블과 어긋남, `window.prompt/confirm` 이 런타임 미지원, 가사 라우트가 갱신 토큰을 쿠키에 persist 안 함.

## Implementation
- **가사 태그 동기화**: `lib/lyrics-assistant/prompt.ts` system prompt 태그 목록을 `CANON_TAGS`(`buildLyricsPayload.ts`)와 일치(`[Pre-Chorus]`/`[Drop]` 제거 → `[Verse 2]`,`[Pre Chorus]`,`[Hook]`,`[Post Chorus]`,`[Final Chorus]` 추가). `buildLyricsPayload.ts` 에 `CANONICAL_SECTION_TAGS` export(단일 출처). 재드리프트 가드 테스트 `lib/lyrics-assistant/prompt.test.ts`.
- **Style 정제(신규 `lib/refineStylePrompt.ts`)**: `translatePrompt.ts` 패턴 복제(Gemini REST, 무료티어, `GEMINI_API_KEY`/`GEMINI_MODEL`). `refineStylePrompt(compiledPrompt, instrumental)` 가 Gemini 로 dense descriptor 재작성, 순수 `finalizeRefined()` 가 저작권 문구 강제 재부착·2000자 클램프·빈값 폴백 처리. 실패/미설정 시 원본 compiled prompt 반환(생성 안 막음). `COPYRIGHT_LINE` 을 `buildMusicPrompt.ts` 에서 export 해 재사용.
- **generate 라우트 연결**: `app/api/music/generate/route.ts` 에서 `compile → refine → buildMinimaxInput`. 메타에 `compiled_music_prompt`(정제 전)·`final_music_prompt`(실제 전송) 둘 다 저장. 흐름: `프롬프트 → 번역 → compile → 정제 → MiniMax`.
- **rename/delete UI 수정**: `components/music-workspace.tsx` — `window.prompt` → 인라인 제목 입력(Enter 저장/Esc 취소/blur 저장), `window.confirm` → 메뉴 내 2단계 삭제확인. 검증 로직 `resolveRenameTitle()` 을 `lib/music.ts` 로 추출 + TDD(`lib/music.test.ts`).
- **가사 인증 쿠키 persist**: `app/api/lyrics/chat/route.ts` — `getUserId` 가 갱신 토큰 반환, 모든 응답에 `setAuthCookies` 로 갱신 쿠키 심음. 기존엔 in-memory refresh 만 해 세션이 조용히 죽고 "Please sign in to use AI lyrics" 가 떴음(생성 라우트는 이미 persist 함).

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Migration apply | `npx @insforge/cli db migrations up 20260617185555_credit-coupons.sql` | Passed |
| HelloTalk seed | DB query for `HELLOTALK-BETA` | Passed: 1 credit, 20 max, 0 redeemed |
| Ledger constraints | DB query for `payments_provider_check` / `payments_status_check` | Passed: includes `coupon` and `redeemed` |
| Unauthenticated RPC/API | DB function call and local `POST /api/credits/redeem-coupon` without cookies | Passed: `unauthenticated` |
| Next build + typecheck | `npm run build` | Passed |
| Full codebase lint | `npm run lint` | Passed |

## Lessons
- Coupon grants belong in a database RPC, not client code, because the coupon counter, one-use rule, ledger row, and credit balance need to commit or roll back together.
- The existing Upgrade modal was the right surface: it keeps paid credits and invite credits in one place without exposing coupon management publicly.

---

# RESULT: Lyrics-based title generation and title-centered covers - 2026-06-18

## Background
- Request: New workspace songs were using the prompt text as the track title, and cover art appeared to follow the prompt more than the title.
- Decision: Stop deriving titles from the prompt. Use Gemini only when lyrics exist, and use genre/mood fallbacks for instrumental or lyricless generations to reduce Gemini quota usage.

## Implementation
- **`lib/musicTitle.ts`**: added title helpers. Lyrics-based songs can ask Gemini for a concise title; instrumental and lyricless paths use deterministic genre/mood titles such as `Dark Techno Instrumental` or `Romantic Korean Ballad Track`.
- **`app/api/music/generate/route.ts`**: replaced `deriveTitle(prompt)` with the new title flow. The fallback title is stored during credit reservation, then updated after a successful reservation so insufficient-credit requests do not spend a title-generation Gemini call.
- **Quota guard**: moved auth and a zero-credit precheck ahead of translation/style-refinement/title Gemini calls, so unauthorized or obviously insufficient-credit requests do not spend Gemini quota.
- **`lib/prompts/buildThumbnailPrompt.ts`** and **`app/api/music/[id]/route.ts`**: rebuilt thumbnail prompts around the saved song title, with genre/mood/lyrics as supporting context and no direct use of the raw prompt.
- **`lib/music.ts`**: removed the old prompt-first `deriveTitle` helper.
- **`lib/musicTitle.test.ts`**: added regression coverage for hook-line fallback titles, instrumental genre/mood titles, lyricless titles, and Gemini output sanitization.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Title helper behavior | `npm run test` | Passed; 50 tests / 9 files |
| Next build + typecheck | `npm run build` | Passed |
| Full codebase lint | `npm run lint` | Passed |

## Lessons
- Title generation is now quota-aware: Gemini is used only for lyric-backed titles and only after auth/credit checks pass.
- Cover quality can be redirected without adding another AI call by changing the Replicate image prompt source from raw prompt context to the persisted title.

---

# RESULT: Auth-aware landing CTA label - 2026-06-18

## Background
- Request: The landing page already sends signed-in users from `Get Started` to `/workspace`, but the wording feels unintuitive for returning users.
- Decision: Keep the anonymous/new-user CTA as `Get Started`, and show returning signed-in users `Open Workspace`.

## Implementation
- **`components/get-started-badge.tsx`**: added an optional `label` prop and changed the default label logic so `href="/workspace"` renders `Open Workspace`; all other/default CTAs keep `Get Started`.
- **Existing home flow reused**: `app/page.tsx` was already resolving `ctaHref` from the InsForge SSR session (`/workspace` for signed-in users, `/auth` otherwise), so no auth flow or route behavior changed.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Auth-aware CTA label | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- The routing was already auth-aware; the UX mismatch was purely copy. Making the shared badge infer the workspace label keeps Header, Hero, CTA section, and Footer consistent without threading extra props through every landing component.

---

# RESULT: Pricing update ??Viral 35怨?+ Free 媛??1怨?吏湲?- 2026-06-17

## Background
- Request: 寃곗젣 ?뚮옖 媛쒗렪. ??湲곗? ??Free(媛??1怨?, Starter $2.99/5怨??좎?), Creator $7.99/20怨??좎?), Viral $14.99/50怨???**30~35怨?*(留덉쭊 諛⑹뼱), Trial $1.99/2怨?寃??
- ?뺤젙 寃곗젙(吏덈Ц ?듯빐): **Viral 35怨?*, **Trial ?앸왂**, **Free = 媛????1怨??먮룞 吏湲?*(UI ?몄텧 ?놁씠 濡쒖쭅留?.
- 媛寃??숈씪($14.99 ?좎?) ??Polar ?좉퇋 ?쒗뭹/env 遺덊븘?? ?щ젅???섎쭔 蹂寃?

## Implementation
- **`lib/credits.ts`**: `viral-pack` credits `50 ??35`. ?⑥씪 異쒖쿂??媛寃?UI "{credits} songs" ?쒓린쨌?뱁썒 異⑹쟾???먮룞 諛섏쁺.
- **`migrations/20260617000000_pricing-update-free-grant.sql`** (?좉퇋):
  - `fulfill_polar_credit_order` RPC ???섎뱶肄붾뵫 ?뚮옖?믫겕?덈뵩 留?`viral-pack 50 ??35` ?숆린?? (??怨좎튂硫?異⑹쟾 ??`credit_plan_mismatch` 濡??ㅽ뙣 ??RPC ??寃利?媛??議댁옱.)
  - ?좉퇋 `grant_free_credit(p_user_id)` SECURITY DEFINER ?⑥닔: `INSERT user_credits(user_id, 1) ON CONFLICT (user_id) DO NOTHING`. 硫깅벑 ???щ젅???됱씠 ?녿뒗 ?좉퇋 ?좎? 理쒖큹 1?뚮쭔 吏湲? 湲곗〈 ??援щℓ쨌?щ줈洹몄씤)? 臾대?寃? `project_admin` ??GRANT.
- **`app/api/auth/callback/route.ts`**: OAuth 肄붾뱶 援먰솚 ?깃났 ??admin ?대씪?댁뼵?몃줈 `grant_free_credit` ?몄텧. Google OAuth 媛 ?좎씪 濡쒓렇??寃쎈줈???좉퇋 ?좎?媛 諛섎뱶???듦낵. try/catch 濡?媛먯떥 吏湲??ㅽ뙣?대룄 濡쒓렇?몄? ??留됱쓬.
- **??젣**: `migrations/20260614000000_add-stripe-checkout.sql` ??誘몄쟻??+ ?깆? Polar 留??ъ슜(Stripe 寃쎈줈 肄붾뱶 誘몄궗??. ?먭꺽 head(`20260613`) ? ??留덉씠洹몃젅?댁뀡 ?ъ씠 ?쒖꽌瑜?留됯퀬 ?덉뼱 dead 留덉씠洹몃젅?댁뀡?쇰줈 ?먮떒???쒓굅.

| 가사 태그 가드 | `vitest prompt.test.ts` RED→GREEN | Passed |
| finalizeRefined | `vitest refineStylePrompt.test.ts` RED→GREEN | Passed |
| resolveRenameTitle | `vitest music.test.ts` RED→GREEN | Passed |
| Full suite | `npx vitest run` | 46 passed (8 files) |
| Full codebase | `npm run lint` | Passed |
| Build + typecheck | `npm run build` | Passed |
| Prod deploy | 사용자가 직접 커밋/푸시/배포 | Pending(사용자) |

## Lessons
- doc(`02_LYRIC_STRUCTURES.md`) / 코드(`CANON_TAGS`) / 어시스턴트 system prompt 3곳이 따로 드리프트할 수 있음 → 단일 출처 export + 가드 테스트로 고정.
- LLM 출력의 안전 문구(저작권)는 절대 신뢰 금지 — 코드가 결정적으로 재부착·클램프. 정제 실패는 항상 원본 폴백으로 생성 비차단.
- 여러 Gemini 콜(번역+가사+정제)이 **같은 무료티어 키 RPM 한도 공유** → 경합 가능. 정제는 매 생성마다 호출되므로 타임아웃 가드는 후속 개선 여지(아직 미적용).
- 인증 라우트는 토큰 갱신 시 반드시 `setAuthCookies` 로 응답에 persist 해야 세션이 안 죽음. in-memory refresh 만 하면 세션이 조용히 만료됨.

## Follow-ups (미적용)
- Gemini 콜(가사·정제)에 AbortController 타임아웃 추가해 무료티어 지연 시 무한 대기 방지.
- 생성 후 `musics.metadata` 의 `compiled_music_prompt` vs `final_music_prompt` 비교로 정제 효과 실측.

---

# RESULT: Pricing update — Viral 35곡 + Free 가입 1곡 지급 - 2026-06-17

## Background
- Request: 결제 플랜 개편. 표 기준 — Free(가입 1곡), Starter $2.99/5곡(유지), Creator $7.99/20곡(유지), Viral $14.99/50곡 → **30~35곡**(마진 방어), Trial $1.99/2곡 검토.
- 확정 결정(질문 통해): **Viral 35곡**, **Trial 생략**, **Free = 가입 시 1곡 자동 지급**(UI 노출 없이 로직만).
- 가격 동일($14.99 유지) → Polar 신규 제품/env 불필요. 크레딧 수만 변경.

## Implementation
- **`lib/credits.ts`**: `viral-pack` credits `50 → 35`. 단일 출처라 가격 UI "{credits} songs" 표기·웹훅 충전량 자동 반영.
- **`migrations/20260617000000_pricing-update-free-grant.sql`** (신규):
  - `fulfill_polar_credit_order` RPC 의 하드코딩 플랜→크레딧 맵 `viral-pack 50 → 35` 동기화. (안 고치면 충전 시 `credit_plan_mismatch` 로 실패 — RPC 에 검증 가드 존재.)
  - 신규 `grant_free_credit(p_user_id)` SECURITY DEFINER 함수: `INSERT user_credits(user_id, 1) ON CONFLICT (user_id) DO NOTHING`. 멱등 — 크레딧 행이 없는 신규 유저 최초 1회만 지급, 기존 행(구매·재로그인)은 무변경. `project_admin` 에 GRANT.
- **`app/api/auth/callback/route.ts`**: OAuth 코드 교환 성공 후 admin 클라이언트로 `grant_free_credit` 호출. Google OAuth 가 유일 로그인 경로라 신규 유저가 반드시 통과. try/catch 로 감싸 지급 실패해도 로그인은 안 막음.
- **삭제**: `migrations/20260614000000_add-stripe-checkout.sql` — 미적용 + 앱은 Polar 만 사용(Stripe 경로 코드 미사용). 원격 head(`20260613`) 와 내 마이그레이션 사이 순서를 막고 있어 dead 마이그레이션으로 판단해 제거.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| credits.ts + callback route | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Migration apply | `db migrations up 20260617000000` | Passed (504 1?????ъ떆???깃났) |
| RPC viral=35 | `db query` pg_get_functiondef LIKE 泥댄겕 | `viral_35 = true` |
| grant_free_credit 議댁옱 | `db query` pg_proc count | `grant_fn = 1` |
| Production deploy | `vercel --prod` | `READY` (https://la-musica.vercel.app, dpl_F3duTnPvqynFWRTCbZyxeqZvZZRj) |

## Lessons
- ?щ젅???섍? ??怨녹뿉 ?곕떎: `lib/credits.ts`(??UI) **?** `fulfill_polar_credit_order` RPC(DB 寃利?媛??. ?쒖そ留?諛붽씀硫?`credit_plan_mismatch` 濡?寃곗젣 異⑹쟾??議곗슜???ㅽ뙣?섎?濡???긽 ?숇컲 ?섏젙.
- Free 臾대즺 吏湲됱? "???놁쓣 ??1 ?쎌엯 + ON CONFLICT DO NOTHING" ?쇰줈 硫깅벑 蹂댁옣 ??留?濡쒓렇???몄텧?대룄 ?덉쟾, 蹂꾨룄 grant-flag 而щ읆 遺덊븘?? ????젣???좎? 沅뚰븳 諛뽰씠???ъ?湲??낆슜 遺덇?.
- Vercel **Git ?먮룞諛고룷 爰쇱쭚** ???몄떆留뚯쑝濡?諛고룷 ???? 諛고룷??`npx vercel --prod --yes` ?섎룞 ?꾩슂.
- 誘몄쟻??濡쒖뺄 留덉씠洹몃젅?댁뀡(Stripe)???먭꺽 head ? ?좉퇋 留덉씠洹몃젅?댁뀡 ?ъ씠瑜?留됱쓬 ???쒖감 ?곸슜 ??dead 留덉씠洹몃젅?댁뀡 ?뺤씤쨌?쒓굅 ?꾩슂.

| Migration apply | `db migrations up 20260617000000` | Passed (504 1회 후 재시도 성공) |
| RPC viral=35 | `db query` pg_get_functiondef LIKE 체크 | `viral_35 = true` |
| grant_free_credit 존재 | `db query` pg_proc count | `grant_fn = 1` |
| Production deploy | `vercel --prod` | `READY` (https://la-musica.vercel.app, dpl_F3duTnPvqynFWRTCbZyxeqZvZZRj) |

## Lessons
- 크레딧 수가 두 곳에 산다: `lib/credits.ts`(앱/UI) **와** `fulfill_polar_credit_order` RPC(DB 검증 가드). 한쪽만 바꾸면 `credit_plan_mismatch` 로 결제 충전이 조용히 실패하므로 항상 동반 수정.
- Free 무료 지급은 "행 없을 때 1 삽입 + ON CONFLICT DO NOTHING" 으로 멱등 보장 → 매 로그인 호출해도 안전, 별도 grant-flag 컬럼 불필요. 행 삭제는 유저 권한 밖이라 재지급 악용 불가.
- Vercel **Git 자동배포 꺼짐** — 푸시만으로 배포 안 됨. 배포는 `npx vercel --prod --yes` 수동 필요.
- 미적용 로컬 마이그레이션(Stripe)이 원격 head 와 신규 마이그레이션 사이를 막음 → 순차 적용 전 dead 마이그레이션 확인·제거 필요.

---

# RESULT: Aggressive genre presets (scene/era/commercial framing) - 2026-06-16

## Background
- Request: stop being conservative — push genre presets to be more "aggressive."
- Clarified intent: push the *reference boundary* (closer to real commercial/scene sound), not just descriptor intensity.
- Safety decision: after flagging platform-ToS, legal, and signal-conflict risks of injecting real artist/song names, the user pivoted to **safe + aggressive** — no artist/song names, scene/era/commercial framing only, copyright safety line kept.

## Implementation
- **`lib/music-prompt/presets.ts` — `GENRE_PRESETS` rewrite (9 genres)**: replaced cautious generic descriptors with scene/era/commercial-anchored language while keeping the same sound-grammar role (no vocal-mode forcing). Examples: EDM → "festival main-stage big-room EDM, chart-ready commercial hook"; Reggaeton → "modern Medellin-style commercial reggaeton, glossy radio-pop sheen, confident late-night perreo energy"; Korean Ballad → "modern Korean drama OST ballad, huge belted final-chorus payoff"; Techno → "peak-time warehouse techno"; Brazilian Funk → "modern baile funk, raw favela party energy". No artist or song names used.
- **`REFERENCE_MAP` expansion**: added four more user-typed-name → generic-descriptor mappings (Karol G, Peso Pluma/corrido, Drake/Travis Scott, Burna Boy/Wizkid/Afrobeats). This is the defensive sanitizer side — it *strips* names users type and substitutes copyright-safe descriptors.
- **`COPYRIGHT_LINE` unchanged**: the always-appended "do not imitate any specific artist, song, melody, or copyrighted track" safety clause is kept intact.
- **Compiler logic untouched**: genre stays "secondary style details" authority; mood cap and vocal-mode resolution unchanged. Scope was genre + reference only.
- **Tests (TDD)**: added RED assertions first — `buildMusicPrompt.test.ts` (festival main-stage, modern Medellin-style commercial reggaeton, Korean drama OST ballad, loud radio-ready electronic mix) and `presets.test.ts` (scene/era commercial framing per genre, a guard that presets never name a banned artist, and Karol G reference-map coverage that does not echo the name back).
- **Docs sync**: `docs/chatgpt-project/01_GENRE_PRESETS.md` genre grammar bullets updated to mirror the new runtime presets.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler + presets | `npm test` | Passed; 38 tests / 5 files |
| Anti-name guard test | `npm test` (presets) | Passed; no genre preset matches a banned artist/song regex |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed (existing workspace-root lockfile warning only) |
| Runtime/doc sync | Inspection of `presets.ts` + `01_GENRE_PRESETS.md` | Passed; ChatGPT Project genre doc mirrors new preset language |

## Lessons
- "Aggressive" was ambiguous; clarifying it as *reference-boundary push* vs *descriptor intensity* changed the whole design — worth resolving before editing.
- Scene/era/commercial framing ("modern Medellin-style commercial reggaeton", "warehouse techno") captures most of a hit's vibe while staying name-free, avoiding the platform-ToS and copyright exposure of literal artist names — and avoids the signal conflict with the always-on copyright safety line.
- Expanding `REFERENCE_MAP` raises vibe fidelity with zero added risk, because it is name-stripping substitution, not name injection.
- A regression-style "presets never name a banned artist" test locks in the safety boundary against future preset edits.

---

# RESULT: Genre reference analysis and preset tuning - 2026-06-16

## Background
- Request: proceed with public YouTube/Spotify-style reference analysis, but align it exactly to the current La Musica Genre dropdown.
- Constraint: do not copy specific songs, melodies, hooks, lyrics, or artist styles. Use public metadata and genre-level patterns only.
- Goal: improve La Musica outputs by extracting prompt-safe genre DNA and applying conservative preset upgrades.

## Implementation
- **`docs/reference-analysis/`**: added a reference-analysis folder with a README and one file per current Genre option: EDM, Reggaeton, Hip-hop / Trap, Techno, Korean Ballad, Brazilian Funk, Afropop Festival, French Maghreb Hip-hop, and Football Chant.
- **Reference analysis docs**: each genre file records public source links, reference-pool notes, common arrangement flow, rhythm/drums, bass, instruments/texture, energy curve, prompt-safe descriptor, and a preset-delta note.
- **`lib/music-prompt/presets.ts`**: conservatively updated all current genre presets with safer, more specific arrangement details from the analysis, such as groove-first reggaeton pocket, dark trap negative space, techno filter automation, Korean ballad pre-chorus lift, and football chant repeatable hook phrasing.
- **`docs/chatgpt-project/01_GENRE_PRESETS.md`**: synced the ChatGPT Project genre preset document with the updated runtime preset language.
- **`lib/music-prompt/buildMusicPrompt.test.ts`**: updated assertions to match the new EDM/reggaeton descriptor wording.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler pure logic | `npm test` | Passed; 35 tests / 5 files |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |
| Reference docs | Code/file inspection | Passed; docs cover the current nine Genre dropdown options and avoid song-copy instructions |
| Runtime/doc sync | Code inspection of `presets.ts` + `01_GENRE_PRESETS.md` | Passed; ChatGPT Project genre doc mirrors the updated runtime preset concepts |

## Lessons
- Public playlist/chart references are useful as discovery scaffolding, but runtime prompts should only receive generic genre grammar.
- Small preset changes should preserve the compiler's separation of concerns: genre describes sound grammar, while Vocal mode controls vocal/instrumental behavior.

# RESULT: ChatGPT Project knowledge files - 2026-06-16

## Background
- Request: prepare four ChatGPT Project upload files so ChatGPT can help with La Musica lyrics/style/prompt work using project-specific context.
- Clarification: do not invent generic "viral song" or "Korean ballad" structures from outside the app; base the files on the current project, supported genres, and existing prompt-engineering implementation.
- Existing source material was spread across `lib/music-prompt/`, music generation routes, pricing/credit code, and engineering notes.

## Implementation
- **`docs/chatgpt-project/01_GENRE_PRESETS.md`**: documented current supported genres, concrete sound grammar, mood presets, use-case presets, and auto vocal behavior from `lib/music-prompt/presets.ts`.
- **`docs/chatgpt-project/02_LYRIC_STRUCTURES.md`**: documented the actual lyrics payload system: optional lyrics, instrumental/vocal behavior, supported section tags, tag normalization, and MiniMax-compatible lyric formatting. It explicitly notes that hardcoded genre lyric templates are not currently part of the app.
- **`docs/chatgpt-project/03_PROMPT_COMPILER_RULES.md`**: documented compiler version `v2`, user-first prompt order, option authority, vocal/instrumental branching, lyricless vocal guidance, reference sanitization, and MiniMax input fields.
- **`docs/chatgpt-project/04_PRODUCT_DECISIONS.md`**: documented current product decisions around hidden prompt engineering, prompt box inputs, credit packs, generation/refund flow, thumbnail generation, storage/metadata policy, and UX/safety principles.
- **`PLAN.md` / `RESULT.md` / `RESULT_ARCHIVE.md`**: tracked the work and archived the previous result.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| ChatGPT Project files | `ls -la docs/chatgpt-project && wc -l docs/chatgpt-project/*.md` | Passed; 4 markdown files created, 746 total lines |
| Project-specific grounding | `rg` inspection for source-of-truth markers and excluded generic structures | Passed; files reference current code sources and explicitly avoid non-app hardcoded lyric templates |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |

## Lessons
- ChatGPT Project knowledge files are most useful when they mirror the app's actual source of truth instead of aspirational prompt examples.
- The lyrics document should describe the current payload contract and tag system; genre-specific lyric templates can be added later only when the product actually adopts them.

---

# RESULT: Prompt box simplification and lyricless vocal handling - 2026-06-16

## Background
- Request: remove the separate Style input because style can already be written in the main prompt.
- Follow-up: lyrics are optional, but vocal generation without user-provided lyrics needed explicit handling so quality does not become ambiguous.
- Constraint: keep the simplified prompt box and existing MiniMax route structure.

## Implementation
- **`components/prompt-box.tsx`**: removed the Style button, Style input, Style icon, related state, reset logic, and `style` payload emission.
- **`lib/music.ts`**: removed `GenerateRequest.style` and removed legacy `Style: ...` prompt composition from `buildMinimaxInput`; MiniMax now receives the compiled prompt directly.
- **`app/api/music/generate/route.ts`**: stopped parsing/persisting `style` and stopped folding it into the translatable user description.
- **`lib/music-prompt/buildMusicPrompt.ts`**: kept lyrics technically optional. When a non-instrumental vocal mode has no lyrics, the final prompt now adds: `if no lyrics are provided, generate original simple singable lyrics that match the user's idea`.
- **`app/api/music/[id]/route.ts`**: thumbnail prompt generation now uses `metadata.genre` instead of removed `metadata.style`.
- **Docs/copy/tests**: updated MiniMax docs, Privacy Policy copy, and compiler tests for lyricless vocal behavior.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler pure logic | `npm test` | Passed; 35 tests / 5 files |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |
| Style removal | `rg` inspection | Passed; no product request/body/UI `style` field remains |
| Lyricless vocal guidance | Unit test | Passed; vocal mode without lyrics keeps `lyrics` undefined and adds original lyric-generation guidance to the prompt |

## Lessons
- A separate Style field duplicates the main prompt and can split the model's strongest signal.
- Lyrics can remain optional, but vocal-without-lyrics needs explicit prompt guidance so the model knows to generate original simple lyrics instead of drifting.

---

# RESULT: Music prompt compiler quality tuning - 2026-06-16

## Background
- Request: option selections were lowering music quality compared with plain prompt + lyrics. Genre and other options were being understood too literally or too strongly by the model.
- Diagnosis: genre presets were placed before the user prompt and some presets forced vocal/instrumental assumptions (`instrumental`, `male vocal`, `crowd vocals`), causing conflicts with lyrics and the Vocal option.
- Follow-up requirement: genre guidance should not just say labels like "reggaeton beat"; it should describe the concrete beat/rhythm/drums/bass/instrumentation pattern.

## Implementation
- **`lib/music-prompt/buildMusicPrompt.ts`**: made the sanitized user idea the first prompt segment (`prioritize this musical idea`), demoted options into `secondary style details`, `mood shading`, and `arrangement goal`, capped mood guidance to two moods, and guarded invalid runtime option values from leaking `undefined` into prompts.
- **`lib/music-prompt/presets.ts`**: rewrote genre presets as detailed sound grammar: rhythm pattern, kick/snare placement, percussion, bass movement, instrument motifs, energy curve, and mix density. Removed vocal/instrumental forcing from genre presets and reference replacements.
- **`lib/music-prompt/types.ts`**: bumped `PROMPT_COMPILER_VERSION` from `v1` to `v2`.
- **Tests/docs**: updated prompt compiler, preset, and sanitizer tests to assert user-first ordering, concrete beat descriptors, no genre-forced instrumental mode on vocal songs, mood limiting, and v2 docs in `docs/MINIMAX_PROMPT_ENGINEERING.md`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Prompt compiler pure logic | `npm test` | Passed; 34 tests / 5 files |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed; Next build completed with the existing workspace-root lockfile warning |
| User-first ordering | Unit test | Passed; compiled prompt starts with the user's idea before option guidance |
| Vocal/genre conflict prevention | Unit test | Passed; vocal reggaeton keeps `female_vocal` and does not inject `Instrumental Latin` / `fully instrumental` from genre guidance |
| Option over-weighting control | Unit test | Passed; mood guidance applies only the first two selected moods |

## Lessons
- For music generation, genre chips should provide concrete audio grammar, not broad genre labels or hidden vocal decisions.
- Options work best as steering hints. The user's prompt and lyrics need to remain the highest-authority signal in the final MiniMax prompt.

---

# RESULT: Insufficient credit UX upgrade - 2026-06-16

## Background
- Request: when a user with no credits tries to generate music, replace the raw `insufficient_credit` error with a friendly message and immediately open the existing Upgrade modal in the center of the screen.
- Existing behavior: the workspace sent the request, received `402 { error: "insufficient_credit" }`, and rendered the raw string as `Error: insufficient_credit` below the track list.
- Constraint: reuse the current credit purchase modal instead of introducing a second billing UI.

## Implementation
- **`components/workspace-shell.tsx`**: added a small client-side shell that owns shared `creditModalOpen` state and renders `WorkspaceNavbar`, `MusicWorkspace`, and the existing `CreditModal` together.
- **`app/workspace/page.tsx`**: kept data fetching in the Server Component, but now passes serializable user/track/credit props into `WorkspaceShell` in line with the Next App Router client boundary guidance.
- **`components/workspace-navbar.tsx`**: removed modal-local state and switched the existing Upgrade menu item to call the shared `onOpenCreditModal` callback.
- **`components/music-workspace.tsx`**: mapped generation failures with `error === "insufficient_credit"` to `Not enough credits. Please upgrade.` and opened the shared centered Upgrade modal from the failed send flow.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Shared modal wiring | Code inspection of `WorkspaceShell` + `WorkspaceNavbar` + `MusicWorkspace` | Passed; navbar and insufficient-credit flow both target the same `CreditModal` state |
| Friendly error mapping | Code inspection of generation failure branch | Passed; `insufficient_credit` becomes `Not enough credits. Please upgrade.` |
| GUI verification | `Computer Use` app-state calls for browser validation | Could not complete; tool timed out in this session |

## Lessons
- A tiny client shell is a clean way to share interactive modal state while keeping the page-level data fetch in a Server Component.
- Returning machine-friendly API error codes is still useful, as long as the client maps them to clear user-facing language before rendering.

---

# RESULT: Manual starter credit grant - 2026-06-16

## Background
- Request: treat `kkw0628001@gmail.com` / `84adcde6-126e-4a36-b3a9-ad0fc9a30896` as a paid user and grant 5 credits.
- Existing billing flow records purchase history in `public.payments` and keeps the spendable balance in `public.user_credits`.
- Goal: apply the credit in the live InsForge project without changing application code or schema.

## Implementation
- **Account verification**: confirmed `auth.users.id = 84adcde6-126e-4a36-b3a9-ad0fc9a30896` matches `kkw0628001@gmail.com`.
- **Payment ledger**: inserted one `public.payments` row with:
  - `provider='manual'`
  - `status='paid'`
  - `credit=5`
  - `amount_cents=299`
  - `currency='usd'`
  - `provider_payment_id='manual-starter-20260616-84adcde6'`
- **Credit balance**: upserted `public.user_credits` for the same user, resulting in a current balance of `5`.
- **Docs**: rotated the previous `RESULT.md` entry into `RESULT_ARCHIVE.md` and recorded this operational change as the latest result.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Project link | `npx @insforge/cli current --json` | Passed; linked to `La Musica` (`e99zrxhb.ap-southeast.insforge.app`) |
| User mapping | `auth.users` query by id/email | Passed; email and UUID match |
| Payment ledger insert | `public.payments` query by `provider_payment_id` | Passed; 1 paid manual row with 5 credits / `299 usd` |
| Credit balance | `public.user_credits` query by user id | Passed; balance is `5` |

## Lessons
- For manual customer-service grants, writing both the payment ledger and the balance table keeps billing history and spendable credits aligned.
- A deterministic `provider_payment_id` is useful for auditability and for preventing accidental duplicate grants if the same operation is retried.

---

# RESULT: Music Prompt Compiler - 2026-06-16

## Background
- Request (task.md): users are not prompt engineers — they describe music simply
  ("hard EDM for workout"). The app must internally convert that into a high-quality
  English MiniMax prompt, hidden from normal users.
- Existing flow passed the raw user text almost verbatim to `minimax/music-2.6` on
  Replicate, so quality depended entirely on the user's prompting skill.
- Decisions: expose structured option chips in the UI; store compiler output in the
  existing `musics.metadata` JSONB (no migration); add vitest scoped to the new pure module.

## Implementation
- **`lib/music-prompt/`** (new pure module, vitest-tested):
  - `types.ts` — Genre/Mood/UseCase/VocalMode unions, `BuildMusicPromptInput`,
    `CompiledPrompt`, `PROMPT_COMPILER_VERSION = "v1"`.
  - `presets.ts` — verbatim genre/mood/use-case/vocal preset strings, `REFERENCE_MAP`
    (artist→generic descriptors), `resolveVocalMode`, and validity sets.
  - `sanitizeReferences.ts` — replaces known artist/song references and strips risky
    phrasing ("exactly like", "똑같이", "그대로", …); copyright line added by the compiler.
  - `buildLyricsPayload.ts` — normalizes section tags; returns `undefined` for instrumental.
  - `buildMusicPrompt.ts` — 12-part formula, instrumental/vocal quality boosters, segment
    de-duplication, and a clamp that always keeps the copyright/safety line intact.
  - `index.ts` — `compileMusicPrompt()` entry + re-exports.
- **`lib/music.ts`** — `GenerateRequest` extended with `genre/moods/useCase/vocalMode/language`.
- **`app/api/music/generate/route.ts`** — compiles server-side, sends compiled
  prompt/lyrics/instrumental to Replicate, stores `...compiled.metadata` (raw_user_description,
  final_music_prompt, prompt_version, vocal_mode, …) + `lyrics_payload`. Credit logic unchanged;
  `musics.prompt` stays the raw user text.
- **`components/prompt-box.tsx`** — Genre/Use-case/Vocal selects + Mood multi-select chips
  behind an Options toggle; standalone Instrumental toggle folded into the Vocal select.
- **`docs/MINIMAX_PROMPT_ENGINEERING.md`** — full developer reference.
- Built via subagent-driven TDD: each task implemented by a fresh subagent, then
  spec-compliance + code-quality reviewed; review findings fixed (copyright-line truncation,
  segment dedupe, `/g` regex `.test()` hazard, union-input validation into metadata, mood a11y).

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| `lib/music-prompt` pure logic | `npm test` (vitest) | 26 passed (4 files) |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` (Next 16 + typecheck) | Passed |
| Full codebase | `npx tsc --noEmit` | Clean |
| 4 task examples | compiler unit tests | Required substrings present; copyright line always present; length ≤ 2000 |
| Reference sanitize | unit tests | "Bad Bunny"/"임창정" removed, generic descriptors + copyright line emitted |
| Union validation | unit tests | bogus genre/useCase/vocalMode never reach compiled metadata |

## Lessons
- The product brief said MiniMax 2.5; the live integration is `minimax/music-2.6` —
  always inspect the actual model/schema before adding parameters.
- A trailing "always append" clause must be appended **after** length-clamping, or the
  clamp silently drops it.
- Global (`/g`) regexes are stateful across `.test()` calls — safe with `String.replace`
  but a trap for `.test()`; keep validation at the compiler boundary so unvalidated
  strings can't leak into persisted metadata.

---

# RESULT: Landing footer section - 2026-06-16

## Background
- Request: add a footer section based on a provided reference component and include the existing policy/terms pages.
- The landing page previously ended after the CTA section with no legal or product footer links.
- Mobile optimization was required so footer links and legal copy remain readable without horizontal overflow.

## Implementation
- **`components/footer-section.tsx`**: added a server-rendered La Musica footer with brand mark, product links, Privacy Policy, Terms of Service, copyright, and a subtle large background wordmark.
- **`app/page.tsx`**: mounted the footer below the landing CTA and passed through the existing auth-aware `ctaHref`.
- **`app/page.tsx`**: changed the landing root from `overflow-hidden` to `overflow-x-hidden` so mobile vertical content remains naturally scrollable while wide decorative assets stay clipped.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |
| Local landing HTML | `Invoke-WebRequest http://127.0.0.1:3000` | Footer text and legal links present |
| Mobile render | Chrome CDP, 390x900 footer crop | No footer text overflow; links include `/privacy` and `/terms`; main overflow is x-hidden/y-auto |
| Desktop render | Chrome CDP, 1440x900 footer crop | No footer text overflow; two-column link layout renders correctly |

## Lessons
- Static footer content should stay as a Server Component to avoid adding unnecessary client JavaScript.
- For long landing pages, `overflow-x-hidden` is safer than blanket `overflow-hidden` because decorative clipping should not constrain vertical content.

---

# RESULT: Legal page contact email update - 2026-06-16

## Background
- Request: update the contact email on both the Privacy Policy and Terms of Service pages.
- Both pages used a shared page-local `CONTACT_EMAIL` constant that fed the visible address and the `mailto:` link.

## Implementation
- **`app/privacy/page.tsx`**: changed `CONTACT_EMAIL` to `wjddnjs0419@hufs.ac.kr`.
- **`app/terms/page.tsx`**: changed `CONTACT_EMAIL` to `wjddnjs0419@hufs.ac.kr`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Legal pages | `rg -n "CONTACT_EMAIL\|ncf-ncglobal\|wjddnjs0419" app\privacy\page.tsx app\terms\page.tsx` | New email present; old email absent |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- Keeping the email in a constant makes visible text and `mailto:` links update together.
- Small legal-copy changes still benefit from build/lint verification because the pages are statically generated.

---

# RESULT: Landing mobile background consistency - 2026-06-16

## Background
- Request: mobile homepage background color looked different from the desktop/web homepage.
- The homepage was using a page-local `bg-slate-950` plus a warm top-right radial gradient.
- On narrow screens that warm gradient sat close to the hero copy and made the surface read warmer/gray compared with desktop.

## Implementation
- **`app/page.tsx`**: replaced the inline Tailwind homepage background utilities with landing-specific classes.
- **`app/globals.css`**: added `landing-surface` so the homepage uses the same `--background` base as the app shell.
- **`app/globals.css`**: added `landing-ambient` with a desktop ambient gradient and a narrower mobile media-query variant that removes the warm top-right wash from the mobile hero area.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |
| Production deploy | `npx vercel --prod --yes` | Passed; deployment ready |
| Production alias | `npx vercel inspect https://la-musica.vercel.app` | Ready; alias attached |
| Live homepage | `Invoke-WebRequest https://la-musica.vercel.app` | 200; content includes `landing-surface` |

## Lessons
- Page-level background tokens are easier to keep consistent across breakpoints than repeating one-off Tailwind gradient strings.
- Warm radial accents should be positioned more carefully on mobile because they cover a much larger share of the first viewport.

## Deployment
- Production URL: `https://la-musica.vercel.app`
- Deployment ID: `dpl_FQMpzMTS5T1mhQBFkM2vwXLCotuy`
- Inspector URL: `https://vercel.com/jeongwon-kim-s-projects/la-musica/FQMpzMTS5T1mhQBFkM2vwXLCotuy`

---

# RESULT: Google OAuth production redirect fix - 2026-06-16

## Background
- Request: production auth page showed `Google sign-in could not be started. Please try again.`
- InsForge auth logs showed `https://la-musica.vercel.app/api/auth/callback is not in the allowed redirect URLs`.
- Metadata confirmed only the localhost callback was allowed.

## Implementation
- Updated `insforge.toml` auth `allowed_redirect_urls` to include `https://la-musica.vercel.app/api/auth/callback`.
- Applied the InsForge backend config with `npx @insforge/cli config apply --file insforge.toml --auto-approve --json`.
- No frontend code change or Vercel redeploy was needed; the deployed app already sends the production callback URL through `NEXT_PUBLIC_APP_URL`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Diagnosis | `npx @insforge/cli logs insforge.logs --limit 80` | Found production callback URL rejection |
| Backend metadata before fix | `npx @insforge/cli metadata --json` | Only localhost callback was allowed |
| Config preview | `npx @insforge/cli config plan --file insforge.toml --json` | One auth redirect change; no skips |
| Config apply | `npx @insforge/cli config apply --file insforge.toml --auto-approve --json` | Applied; no skips |
| Backend metadata after fix | `npx @insforge/cli metadata --json` | Production callback URL present |
| OAuth start | `Invoke-WebRequest https://la-musica.vercel.app/api/auth/google -Method POST -MaximumRedirection 0` | 307 to Google OAuth URL |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- OAuth production launches need the frontend app URL and backend allowed redirect list updated together.
- InsForge `config plan` is a clean way to confirm auth redirect changes before applying them.

## Deployment
- Frontend redeploy not required.
- Backend auth config updated for `https://la-musica.vercel.app/api/auth/callback`.

---

# RESULT: Vercel production publishing - 2026-06-16

## Background
- Request: publish La Musica to Vercel.
- The repo had no existing `.vercel` link and no Vercel project named `la-musica`.
- Local Vercel login was completed by the user before deployment.

## Implementation
- Created and linked the Vercel project `jeongwon-kim-s-projects/la-musica` through Vercel CLI.
- Synced production environment variables from `.env.local` without printing secret values.
- Set production `NEXT_PUBLIC_APP_URL` to `https://la-musica.vercel.app` instead of the local development URL.
- Deployed production build `dpl_8i7fTjRfRa6DQtPwnDjqPcCZSCot`.
- Confirmed the production alias `https://la-musica.vercel.app`.
- Cleaned up the duplicate `.vercel` ignore entry added by the Vercel link command.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |
| Vercel auth | `npx vercel whoami` | Passed (`jake051096-4385`) |
| Vercel project | `npx vercel project inspect la-musica` | Passed; project linked |
| Production env | `npx vercel env ls production` | Passed; 10 variables present |
| Production deploy | `npx vercel --prod --yes` | Passed; deployment ready |
| Production alias | `npx vercel inspect https://la-musica.vercel.app` | Ready; alias attached |
| Live homepage | `Invoke-WebRequest https://la-musica.vercel.app` | 200; content includes `La Musica` |

## Lessons
- Vercel CLI can deploy without GitHub integration; the GitHub repository connection failed only because the Vercel account needs a GitHub Login Connection.
- For this app, `NEXT_PUBLIC_APP_URL` must be production-specific so auth and payment redirect URLs do not point back to localhost.

## Deployment
- Production URL: `https://la-musica.vercel.app`
- Inspector URL: `https://vercel.com/jeongwon-kim-s-projects/la-musica/8i7fTjRfRa6DQtPwnDjqPcCZSCot`
- Default deployment URL: `https://la-musica-k9bgwexmb-jeongwon-kim-s-projects.vercel.app`

---

# RESULT: Main and workspace mobile optimization - 2026-06-16

## Background
- Request: optimize the homepage and workspace for mobile.
- Follow-up: homepage mobile navigation should use a hamburger side menu.
- Follow-up: workspace profile should be a plain circular avatar only, with no glass capsule or visible username on desktop.
- Follow-up: mobile profile dropdown must stay open long enough to tap Upgrade or Sign out.

## Implementation
- **`components/headersection.tsx`**: converted the homepage header to a client component with an inline SVG hamburger button on mobile, a right-side slide-out menu, backdrop close, close icon, and mobile nav links.
- **`components/herosection.tsx`**: moved mobile hero copy ahead of the shader visual, removed forced `<br />` line breaks, reduced mobile visual height, and tightened mobile spacing.
- **`components/sample-music-section.tsx`**, **`components/pricing-section.tsx`**, **`components/cta-section.tsx`**: reduced mobile padding, card rounding, and heading scale so sections scan better on narrow screens.
- **`components/workspace-navbar.tsx`**: made the search bar wrap to a second row on mobile, changed the profile button to a plain circular avatar/initial with no username, switched the dropdown from hover-close behavior to click plus outside-click/Escape close, and moved the mobile dropdown below the search input so it does not overlap the field.
- **`components/music-workspace.tsx`**, **`components/prompt-box.tsx`**, **`components/workspace-music-player.tsx`**: tightened mobile gutters, made track metadata and prompt controls wrap, and stacked player controls more comfortably on small screens.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |
| Homepage mobile nav | `Invoke-WebRequest http://localhost:3000` includes `Open menu`, `Mobile primary`, and updated mobile classes | Passed |
| Workspace profile | `Invoke-WebRequest http://localhost:3000/workspace` shows circular avatar classes and no visible username span | Passed |
| Dropdown tap behavior | Dropdown now uses click state with outside-click/Escape close instead of mouse leave close | Passed by inspection |
| Mobile dropdown placement | Dropdown uses mobile fixed positioning below the wrapped search row, then returns to avatar-relative positioning at `sm` and above | Passed by inspection |

## Lessons
- Mobile dropdowns should not depend on hover or mouse leave semantics; tap targets need click ownership and outside-click dismissal.
- Keeping mobile nav as a drawer avoids squeezing desktop nav links into a header that needs strong brand presence.

## Deployment
- Not deployed. Local dev server was already running on port 3000 during verification.
- In-app Browser was unavailable in this session, so visual screenshot verification could not be completed here.

---

# RESULT: Landing fixed generated sample tracks - 2026-06-16

## Background
- Request: replace the landing sample section with the four most recently created songs at the time of the request.
- Constraint: do not hardcode titles, audio URLs, or thumbnail URLs; fetch them from InsForge.
- Constraint: keep this section pinned to those four songs, so newer generated songs do not rotate into the section automatically.

## Implementation
- **`lib/landing-samples.ts`**: added a server-side fixed ID list for the four selected `musics` rows and fetches their `title`, `prompt`, `audio_url`, `thumbnail_url`, and `duration_seconds` through the InsForge admin client.
- **`lib/landing-samples.ts`**: derives each card description from the first phrase of the stored prompt, so descriptions come from the selected song data rather than duplicated card metadata.
- **`app/page.tsx`**: loads the fixed sample tracks on the server and passes serializable track props into the client sample section.
- **`components/sample-music-section.tsx`**: removed the temporary local WAV/sample art array and renders the fetched title, thumbnail, audio URL, derived description, and duration label.
- **Landing copy**: changed the section heading/subcopy to present the tracks as pinned real La Musica creations.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Landing data | `Invoke-WebRequest http://localhost:3000` contains `Hiphop Style`, `EDM Style`, `House Style`, `Techno Style`, and `Featured creations` | Passed |
| Pinning behavior | Sample query uses `LANDING_SAMPLE_MUSIC_IDS` instead of `order by created_at desc limit 4` at render time | Passed by inspection |

## Lessons
- Pinning a generated-content showcase should fix only stable row IDs, then fetch mutable display fields from the database.
- Server Components are a good fit for loading selected public-facing media while keeping the admin API key server-only.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: AI music thumbnail generation - 2026-06-16

## Background
- Request: after successful AI music generation, automatically generate a square album-cover thumbnail with Replicate.
- Existing flow: `/api/music/generate` spends one credit and starts MiniMax on Replicate; `/api/music/[id]` polls, stores the mp3, and finalizes the `musics` row.
- Constraint: previous songs should keep the default image, thumbnail failures must not fail music generation or refund credits, and Replicate tokens must stay server-only.

## Implementation
- **`migrations/20260613000000_add-music-thumbnails.sql`**: added nullable `thumbnail_url`, `thumbnail_key`, `thumbnail_prompt`, and `thumbnail_status` columns, leaving existing songs unbackfilled so they keep fallback artwork.
- **`lib/prompts/buildThumbnailPrompt.ts`**: added the album-cover prompt builder with title/style/lyrics/music prompt context and required `No text, no logo, no watermark.` instruction.
- **`lib/image/generateThumbnail.ts`**: added server-only Replicate Flux Schnell thumbnail generation with `aspect_ratio: "1:1"` and `output_format: "webp"`.
- **`app/api/music/[id]/route.ts`**: after successful audio persistence, marks `thumbnail_status=pending`, generates/stores the webp thumbnail, then updates `thumbnail_status=succeeded`; failures are logged and recorded as `failed` without changing music success or credits.
- **`app/api/music/[id]/route.ts`**: changed music failure paths in the polling route to use `refund_failed_music_credit`, preserving the one-credit refund policy for actual music failures only.
- **`components/music-thumbnail.tsx`**, **`components/music-workspace.tsx`**, **`components/workspace-music-player.tsx`**: show generated thumbnails when present, otherwise keep the existing music-icon fallback; player thumbnails can overlay the title.
- **`.env.example`**, **`.gitignore`**: documented `REPLICATE_API_TOKEN` and existing app/server environment variables, and allowed the example env file to be tracked.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| DB migration | `npx @insforge/cli db migrations up 20260613000000_add-music-thumbnails.sql` | Passed |
| DB schema | `npx @insforge/cli db query "select column_name, data_type ... thumbnail_%"` | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Existing songs fallback | Migration uses nullable thumbnail columns and no backfill | Passed by inspection |
| Credit policy | Thumbnail failure path only updates thumbnail fields; music failure path calls `refund_failed_music_credit` | Passed by inspection |

## Lessons
- In this app, "generation success" happens in the polling route, so post-success media work belongs there rather than in the initial POST route.
- The thumbnail migration needed to be timestamped before the unrelated pending Stripe migration so it could be applied without touching billing schema.

## Deployment
- Migration applied to the currently linked InsForge project. Frontend not deployed; commit/push still required when ready.

---

# RESULT: Landing pricing anchor and sample music gallery - 2026-06-16

## Background
- Request: connect the Header Pricing menu so it scrolls to the pricing section.
- Request: add a listenable sample songs section above pricing, using temporary album-cover style artwork and a centered SVG play button.
- Constraint: avoid inline styles; componentize and use Tailwind styling.

## Implementation
- **`components/pricing-section.tsx`**: added `id="pricing"` and sticky-header scroll offset so the existing Header Pricing link targets the section correctly.
- **`components/sample-music-section.tsx`**: added a client component with four sample cards, Tailwind-only cover art, clip-path utility classes, single-audio playback, active state, and playback error handling.
- **`public/icons/play-sample.svg`**: added the centered play button SVG asset used on each album cover.
- **`public/samples/*.wav`**: generated four short local preview WAV files so samples do not depend on remote audio URLs.
- **`app/page.tsx`**: placed the sample music section between Hero and Pricing.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Inline style guard | `rg -n "style=|<style" components/sample-music-section.tsx components/pricing-section.tsx app/page.tsx` | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Local HTML response | `Invoke-WebRequest http://localhost:3000` contains `id="pricing"`, `id="features"`, sample title, and play SVG path | Passed |
| Static assets | HTTP 200 for `/icons/play-sample.svg` and all four `/samples/*.wav` files | Passed |
| Browser plugin check | In-app Browser and Chrome extension surfaces | Blocked: unavailable in this session |

## Lessons
- Hash navigation with a sticky header needs a target id plus scroll offset on the target section.
- Tailwind arbitrary utilities are enough for temporary clipped album art, avoiding inline `style` props while keeping the component flexible.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Pricing section credit checkout wiring - 2026-06-14

## Background
- Request: make `components/pricing-section.tsx` Get credits buttons open the real checkout flow.
- Existing issue: pricing cards were wired to the remote Stripe `/api/checkout` helper, while the workspace Upgrade modal uses the local Polar credit checkout at `/api/credits/checkout`.

## Implementation
- **`components/pricing-section.tsx`**: switched plan data from `lib/plans` to `lib/credits` so plan IDs match the workspace Upgrade modal and Polar checkout API.
- **`components/pricing-section.tsx`**: wired Get credits buttons to `POST /api/credits/checkout` with `{ planId }`, then redirects to the returned checkout URL.
- **`components/pricing-section.tsx`**: added unauthenticated handling (`401` redirects to `/auth`) plus a small error message when checkout creation fails.
- **`components/pricing-section.tsx`**: kept the existing pricing copy and highlighted Creator plan via local presentation metadata.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Pricing section lint | `npx eslint components/pricing-section.tsx` | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- Shared billing UI should use the same plan ID source as the checkout API to avoid provider mismatches after merges.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Origin main update merge - 2026-06-14

## Background
- Request: apply only the GitHub update delta from `wjddnjs0419-sudo/La-musica` without cloning a fresh copy.
- Local working tree had uncommitted app, billing, migration, and workflow-document changes, so the update needed to preserve local work while fast-forwarding to `origin/main`.

## Implementation
- Fetched and fast-forwarded `main` from `77cc1ed` to `e4be16a`.
- Temporarily stashed local changes, applied the remote update, then restored the stash.
- Resolved conflicts in `PLAN.md`, `RESULT.md`, `RESULT_ARCHIVE.md`, and `components/credit-modal.tsx`.
- Kept the local Polar credit modal flow wired to `/api/credits/checkout` while preserving the remote Stripe checkout files and pricing-page additions.
- Preserved local untracked credit/webhook helpers and migration files from the stash.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Merge conflict cleanup | `Select-String` conflict marker scan | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- When remote billing work and local billing work diverge, resolve UI entry points deliberately so the existing checkout provider does not silently switch.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Main-page LineWaves CTA section - 2026-06-13

## Background
- Request: add a CTA section to the main page using the reactbits `LineWaves` WebGL background (props supplied by user).
- Constraint: componentize, Tailwind only, no inline styles.

## Implementation
- **`components/LineWaves.tsx`**: ported the reactbits ts-tailwind `LineWaves` source (OGL shader). Added `"use client"`. Reordered init so `program` is created before `resize()`, allowing `const` (satisfies `prefer-const`). Container uses Tailwind `h-full w-full`, no inline styles.
- **`components/cta-section.tsx`**: full-width section. `LineWaves` sits in a `pointer-events-none absolute inset-0 -z-10` background layer with the user-supplied props (color1 `#00296a`, color2 `#a4aab2`, color3 `#6c7d98`, brightness 0.2, rotation -45, mouse interaction on). Centered copy overlay is `pointer-events-none`; the reused `GetStartedBadge` (`/auth`) wrapper is `pointer-events-auto`.
- **Copy**: headline "Your next track starts here." + subtext + Get Started button.
- **`app/page.tsx`**: render `<CtaSection />` below `<HeroSection />`.
- **Dependency**: added `ogl`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| LineWaves + CTA | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- reactbits ships a `ts-tailwind` variant (`src/ts-tailwind/Backgrounds/<Name>/<Name>.tsx`) already Tailwind, no inline styles; just add `"use client"` and the `ogl` dep.
- ESLint `prefer-const` fires on `let x; ... x = ...` assigned once; create the value before any closure that reads it so it can be `const`.

## Deployment
- Frontend change only; not yet released. Commit/push pending.

---

# RESULT: Music generation API auth refresh fix - 2026-06-12

## Background
- Reported error: `POST /api/music/generate` returned `401 {"error":"unauthorized"}` during music generation.
- The API route was reading only the existing server cookie access token. Because `/api/*` is excluded from the proxy refresh path, an expired/missing access token with a valid refresh token could still fail as unauthorized.

## Implementation
- **`app/api/music/generate/route.ts`**: added route-local auth recovery using `refreshAuth({ request, cookies })` when `getCurrentUser()` fails from cookies.
- **`app/api/music/generate/route.ts`**: retries the user lookup with the refreshed access token before returning `401`.
- **`app/api/music/generate/route.ts`**: writes refreshed auth cookies back on JSON responses with `setAuthCookies(...)`, including error responses.
- **`app/api/music/generate/route.ts`**: preserved the credit reservation, Replicate prediction creation, failed-generation refund, and `remaining_credit` response behavior.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| API route typecheck | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- API routes that bypass the session-refresh proxy need their own refresh fallback when they depend on a live InsForge user session.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Manual credit grant and workspace credit display - 2026-06-12

## Background
- Request: manually grant 100 credits to `jake051096@gmail.com`.
- Request: move Instrumental next to Style in `components/prompt-box.tsx`.
- Request: put remaining credits where Instrumental used to be.
- Request: use a minimal BlueStacks-style SVG icon and keep the credit display visually aligned with the other controls.
- Follow-up: remove the badge wrapper styling and make the credit display flatter/minimal.

## Implementation
- **Database**: inserted one manual paid payment ledger row for `jake051096@gmail.com` with `provider='manual'`, `credit=100`, and `amount_cents=0`.
- **Database**: upserted `public.user_credits` for the same user, bringing the current balance to 100.
- **`app/workspace/page.tsx`**: reads the signed-in user's `user_credits.credit` and passes it to the client workspace.
- **`components/music-workspace.tsx`**: owns `remainingCredit` client state and updates it from `/api/music/generate` responses.
- **`app/api/music/generate/route.ts`**: returns `remaining_credit` on successful generation and insufficient-credit responses.
- **`components/prompt-box.tsx`**: moved Instrumental beside Style and replaced its former right-side spot with a minimal credit count plus stacked-square SVG icon.
- **`components/prompt-box.tsx`**: flattened the credit indicator by removing the separate pill background/ring and matching the default control text color.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Manual payment ledger | `public.payments` query by provider payment id | Passed |
| Manual credit balance | `auth.users` + `public.user_credits` query | Passed: `100` |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- The credit count should be server-seeded for the initial workspace render, then updated from generation API responses so the UI stays in sync without a full refresh.

## Deployment
- Manual credit grant applied to linked InsForge project `La Musica`.
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Minimal Polar fulfillment and credit spending - 2026-06-12

## Background
- Request: handle the minimum needed Polar webhook behavior only.
- Request: when a user pays, record the payment in `public.payments`.
- Request: credit Starter with 5 songs, Creator with 20 songs, and Viral Pack with 50 songs.
- Request: spend 1 credit for each music generation.

## Implementation
- **`migrations/20260612104325_polar-credit-fulfillment.sql`**: added `polar` to the `public.payments.provider` check constraint.
- **`migrations/20260612104325_polar-credit-fulfillment.sql`**: added admin-only `public.fulfill_polar_credit_order(...)` to insert paid Polar orders idempotently and upsert `public.user_credits`.
- **`migrations/20260612104325_polar-credit-fulfillment.sql`**: added admin-only `public.create_music_with_credit(...)` and `public.refund_failed_music_credit(...)` for atomic credit spending and startup-failure refund.
- **`app/api/webhooks/polar/route.ts`**: added signed Polar webhook handling with `POLAR_WEBHOOK_SECRET`; only `order.paid` is fulfilled, all other events are acknowledged and ignored.
- **`app/api/music/generate/route.ts`**: reserves a music row by spending 1 credit before starting Replicate; insufficient balance returns `402 insufficient_credit`.
- **`lib/insforge-admin.ts`**: added a server-only admin client helper using `INSFORGE_API_KEY`.
- **`package.json` / `package-lock.json`**: added `@polar-sh/sdk` for official webhook signature validation.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Migration apply | `npx @insforge/cli db migrations up 20260612104325_polar-credit-fulfillment.sql` | Passed |
| Provider constraint | `payments_provider_check` catalog query | Passed: includes `polar` |
| RPC existence | `pg_proc` query for 3 fulfillment/credit functions | Passed |
| RPC permissions | `information_schema.routine_privileges` query | Passed: `project_admin` only |
| Credit guard | Direct SQL call with no balance | Passed: `insufficient_credit` |
| Webhook signature guard | unsigned `POST /api/webhooks/polar` | Passed: `403` |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- Fulfillment should be idempotent on the provider order id, not on redirect success URLs.
- Credit balance changes are safest as database functions so payment recording, balance top-up, and generation spending cannot drift apart.

## Deployment
- Migration applied to linked InsForge project `La Musica`.
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Polar credit checkout session wiring - 2026-06-12

## Background
- Request: connect the credit modal buttons to real Polar checkout sessions.
- Environment: `.env.local` has `POLAR_API_TOKEN`, `POLAR_STARTER_PRODUCT_ID`, `POLAR_CREATOR_PRODUCT_ID`, and `POLAR_VIRAL_PACK_PRODUCT_ID`.
- Constraint: keep Polar token and product IDs server-side; do not hardcode secrets.

## Implementation
- **`lib/credits.ts`**: added the shared Starter, Creator, and Viral Pack credit plan definitions.
- **`app/api/credits/checkout/route.ts`**: added authenticated `POST /api/credits/checkout` that validates the requested plan, reads the matching Polar product ID from env, creates a Polar checkout session, and returns the checkout URL.
- **`app/api/credits/checkout/route.ts`**: sends Polar `external_customer_id`, customer email/name when available, `success_url`, `return_url`, and metadata (`user_id`, `plan_id`, `credit`) for later fulfillment/webhook reconciliation.
- **`components/credit-modal.tsx`**: turned plan cards into checkout buttons with loading and error states, then redirects the browser to the returned Polar checkout URL.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Polar product env | Product lookup for `POLAR_STARTER_PRODUCT_ID` | Passed: Starter, active one-time product |
| Polar product env | Product lookup for `POLAR_CREATOR_PRODUCT_ID` | Passed: Creator, active one-time product |
| Polar product env | Product lookup for `POLAR_VIRAL_PACK_PRODUCT_ID` | Passed: Viral Pack, active one-time product |
| API guard | `POST /api/credits/checkout` without auth | Passed: `401 {"error":"unauthorized"}` |
| Full codebase | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- Polar checkout sessions require a product ID; keeping the IDs in env lets the client stay plan-based while the server owns billing configuration.
- Polar supports copying checkout metadata to the resulting order/subscription, so plan and user metadata should be present at checkout creation time for later webhook fulfillment.

## Deployment
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Workspace track list pagination (7/page) - 2026-06-13

## Background
- Request: limit generated tracks to 7 per page in `components/music-workspace.tsx`.
- Request: page navigation via white `<` / `>` SVG icons, smooth transitions.
- Goal: prevent the track list page from growing infinitely long.

## Implementation
- **`components/music-workspace.tsx`**: added `PAGE_SIZE = 7` and `page` state plus a `scrollRef` on the scroll container.
- **Icons**: added white-stroke `ChevronLeftIcon` / `ChevronRightIcon` SVGs.
- **Derivation**: `totalPages` from `filteredTracks`; `safePage` clamps the page at render time so a shrinking list never strands an out-of-range page.
- **Query reset**: render-time "previous render" pattern (`prevQuery` state) resets to page 0 when the search query changes — avoids `react-hooks/set-state-in-effect`.
- **Render**: list maps `pagedTracks` (current 7-slice); pagination controls show only when `totalPages > 1`, with `N / total` indicator and end-disabled buttons.
- **Smooth**: `goToPage` scrolls the list container to top with `behavior: "smooth"`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Pagination + icons | `npm run lint` | Passed |
| Full codebase | `npm run build` | Passed |

## Lessons
- React 19 / Next 16 lint forbids `setState` inside `useEffect` (`react-hooks/set-state-in-effect`); use render-time state adjustment (clamp via derived value, reset via previous-value comparison) instead of effects.

## Deployment
- Frontend change only; not yet released. Commit/push pending.

---

# RESULT: InsForge credit and payments schema - 2026-06-12

## Background
- Request: use InsForge CLI to create a credit field.
- Request: create a new payments table with only the minimum needed fields.
- Prior inspection: no existing `credit` column and no app-owned `public.payments` table existed.
- Constraint: avoid modifying InsForge-managed schemas such as `auth` and the existing managed `payments` schema.

## Implementation
- **`migrations/20260612055742_add-credit-and-payments.sql`**: added `public.user_credits` with `user_id`, `credit`, `created_at`, and `updated_at`.
- **`migrations/20260612055742_add-credit-and-payments.sql`**: added minimal app ledger `public.payments` with user, credit amount, monetary amount/currency, status, provider, optional provider payment id, and timestamps.
- **RLS**: enabled row level security on both tables.
- **Access**: authenticated users can only `SELECT` their own rows; runtime `INSERT`, `UPDATE`, and `DELETE` privileges were revoked for `anon` and `authenticated`.
- **Indexes**: added user/date lookup indexes and a unique provider payment id index for webhook/idempotency safety.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Migration apply | `npx @insforge/cli db migrations up 20260612055742_add-credit-and-payments.sql` | Passed |
| Table existence | `information_schema.tables` query for `public.user_credits`, `public.payments` | Passed |
| Columns | `information_schema.columns` query | Passed |
| RLS policies | `pg_policies` query | Passed |
| Runtime grants | `information_schema.role_table_grants` query | Passed |
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |

## Lessons
- App credit state should live in `public` app-owned tables instead of altering InsForge-managed `auth.users`.
- The managed `payments` schema already exists for provider integration, so app-facing payment history should be explicitly schema-qualified as `public.payments`.

## Deployment
- Migration applied to linked InsForge project `La Musica`.
- Not deployed as a frontend release. Commit/push still required when ready.

---

# RESULT: Credit modal entry from profile popover - 2026-06-12

## Background
- Request: add an `Upgrade` button in the profile navbar popover.
- Request: use a minimal music-note SVG icon.
- Request: open a React Portal based credit modal from the popover.
- Request: keep styling componentized and Tailwind-based, without inline styles.
- Pricing model: Starter `$2.99 / 5 songs`, Creator `$7.99 / 20 songs`, Viral Pack `$14.99 / 50 songs`.

## Implementation
- **`components/credit-modal.tsx`**: added a client-side portal modal using `createPortal(..., document.body)`.
- **`components/credit-modal.tsx`**: added three compact Tailwind pricing cards showing only price and song credits.
- **`components/credit-modal.tsx`**: added overlay click close, close button, and Escape-key close.
- **`components/workspace-navbar.tsx`**: added an `Upgrade` popover item with a minimal music-note SVG and connected it to the modal state.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run build` | Passed |
| Full codebase | `npm run lint` | Passed |
| Inline style guard | `rg -n "style=|<style" components/credit-modal.tsx components/workspace-navbar.tsx` | No matches |
| Browser check | in-app Browser plugin | Blocked: `iab` browser unavailable in this session |

## Lessons
- Next.js client components can safely render portal UI by guarding `document` access during prerender instead of using a mount-state effect.

## Deployment
- Not deployed locally. Commit/push still required when ready.

---

# RESULT: Music card metadata cleanup ??2026-06-12

## Background
- Request: hide pending music card metadata such as `--:-- * Today`.
- Request: remove the `*` separator between duration and date on completed music cards.

## Implementation
- **`components/music-workspace.tsx`**: skipped the metadata row for `pending` and `processing` cards.
- **`components/music-workspace.tsx`**: removed the `*` separator and displayed duration/date with spacing only.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| Full codebase | `npm run lint` | Passed |
| Production build | `npm run build` | Passed |

## Lessons
- Pending cards should avoid placeholder metadata that looks like final track data.

## Deployment
- Not deployed locally. Commit/push still required when ready.

---

# RESULT: Music card duration fallback fix — 2026-06-12

## 배경
- 요청: 뮤직카드에서 노래 길이가 실제와 다르게 `1:00`으로 보이는 문제 확인 및 수정.
- 확인 결과: `duration_seconds`가 DB에 저장되지 않는 상태에서 카드 formatter가 null/0 값을 `1:00`으로 표시하고, 하단 플레이어도 duration fallback을 60초로 사용하고 있었음.

## 구현
- **`components/music-workspace.tsx`**: 카드 duration fallback을 `1:00`에서 `--:--`로 변경해 실제 길이를 모를 때 잘못된 1분 표시가 나오지 않도록 수정.
- **`components/workspace-music-player.tsx`**: 플레이어의 `60`초 fallback 제거. 실제 duration을 모를 때는 전체 시간을 `--:--`로 표시하고 seek range를 비활성화.
- **`components/music-workspace.tsx`**: `<audio>`의 `loadedmetadata` 이벤트에서 실제 mp3 duration을 읽어 로컬 track 상태에 반영하고, 서버 PATCH로 `duration_seconds`를 저장하도록 추가.
- **`app/api/music/[id]/route.ts`**: 기존 rename PATCH를 유지하면서 `duration_seconds` 부분 업데이트도 받을 수 있도록 확장. 비어 있는 update, 잘못된 title, 비정상 duration 값은 400으로 거절.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입/프로덕션 빌드 | `npm run build` | 통과 |

## 교훈
- 모델이 실제 길이를 직접 알려주지 않는 비동기 생성 플로우에서는 UI fallback이 사실처럼 보이면 안 된다.
- 브라우저 audio metadata는 이미 재생 플로우에 있으므로, 별도 mp3 parser 없이 실제 duration을 점진적으로 채우는 현실적인 경로가 된다.

## 배포
- 미배포(로컬). git 커밋/푸시는 사용자 요청 필요.

---

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

---

# RESULT: Workspace 하단 연동 음악 플레이어 — 2026-06-11

## 배경
- 요청: `/workspace`의 `PromptBox` 아래에 현재 디자인에 맞는 음악 재생 바를 추가.
- 요청: 위쪽 뮤직 카드에서 재생하면 아래쪽 플레이어가 뜨고, 카드와 플레이어가 같은 재생 상태로 연동되어야 함.
- 요청: 기본 앨범 썸네일을 만들고, inline style을 지양하며 컴포넌트화.

## 구현
- **`components/workspace-music-player.tsx`**: 하단 플레이어 컴포넌트 추가. 기본 앨범 썸네일, 중앙 play/pause, seek bar, 시간 표시, 볼륨 슬라이더, 닫기 버튼을 Tailwind class 기반으로 구현.
- **`components/music-workspace.tsx`**: 카드별 로컬 `<audio>`를 제거하고 단일 `audioRef`/`activeTrackId`/`playing`/`currentTime`/`duration`/`volume` 상태를 상위에서 관리하도록 변경.
- **`components/music-workspace.tsx`**: 위쪽 트랙 행의 재생 버튼 클릭 시 active track 설정, 단일 오디오 즉시 재생, 하단 플레이어 표시, 카드 아이콘 상태 동기화.
- **`components/music-workspace.tsx`**: 하단 플레이어의 play/pause, seek, volume, close 조작이 같은 오디오 상태를 제어하도록 연결.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입/빌드 | `npm run build` | 통과 |

## 교훈
- 카드와 하단 플레이어처럼 같은 미디어 상태를 보여주는 UI는 각 컴포넌트에 audio를 따로 두지 않고 상위에서 단일 오디오 상태를 소유해야 동기화가 안정적임.
- React 19 lint 규칙상 삭제 후 상태 정리는 effect보다 삭제 성공 이벤트 핸들러에서 처리하는 편이 더 명확하고 경고가 없음.

## 배포
- 미배포(로컬). git 커밋/푸시는 사용자 요청 필요.

---

# RESULT: Workspace 검색/액션 아이콘 정리 — 2026-06-11

## 배경
- 요청: 새로 넣은 workspace 중앙 SearchInput 기능을 기존 navbar search input으로 옮기고, 중복 검색 입력 UI를 제거.
- 요청: 트랙 오른쪽 보라색 파형 컴포넌트 제거.
- 요청: `...` 드롭다운 트리거를 가로 점이 아닌 세로 점 SVG로 변경.

## 구현
- **`components/workspace-navbar.tsx`**: 기존 search input placeholder를 `Search...`로 정리하고, 입력 변경 시 `workspace-search` 커스텀 이벤트를 발행하도록 연결.
- **`components/music-workspace.tsx`**: 중앙 검색 입력/SVG 제거. `workspace-search` 이벤트 수신을 기존 트랙 필터링 로직에 연결.
- **`components/music-workspace.tsx`**: 보라색 `WaveIcon` 컴포넌트와 렌더링 제거. pending spinner 색상은 amber 계열로 정리.
- **`components/music-workspace.tsx`**: 드롭다운 트리거를 세로 점 3개 SVG로 변경.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입/빌드 | `npm run build` | 통과 |

## 교훈
- 검색 UI는 한 곳(navbar)에만 두고 목록 컴포넌트는 필터 상태만 받는 쪽이 화면 중복을 줄임.
- 아이콘성 장식은 별도 컴포넌트보다 요구한 SVG를 직접 유지하는 편이 변경 의도가 명확함.

## 배포
- 미배포(로컬). git 커밋/푸시는 사용자 요청 필요.

---

# RESULT: Workspace DB 곡 목록/관리 액션 — 2026-06-11

## 배경
- 문제: `musics` 테이블에는 완료 곡 3개가 저장되어 있지만, workspace 클라이언트 상태가 빈 배열로 시작해서 기존 DB 곡이 보이지 않음.
- 목표: 저장된 내 곡을 화면 중앙 목록으로 표시하고, 각 곡을 Rename/Download/Delete 드롭다운 액션으로 관리.

## 구현
- **`app/workspace/page.tsx`**: 서버 컴포넌트에서 로그인 사용자의 `musics`를 조회해 `MusicWorkspace initialTracks`로 전달.
- **`components/music-workspace.tsx`**: 초기 DB 목록 렌더링, 중앙 Search 입력, 트랙 행 UI, 커스텀 play/pause, 상태 배지, 행별 액션 드롭다운 추가.
- **`app/api/music/[id]/route.ts`**: `PATCH`로 title 업데이트, `DELETE`로 소유자 행 삭제 및 저장소 cleanup 추가.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과 |
| 타입·컴파일 | `npm run build` | 통과 |
| workspace 응답 | `Invoke-WebRequest http://localhost:3000/workspace` | 200 OK |

## 교훈
- workspace 목록은 서버에서 초기 DB 상태를 내려줘야 새로고침/재방문 시 비어 보이지 않음.
- Delete는 DB 삭제를 우선 성공시키고 Storage 정리는 best-effort로 처리.

## 배포
- 미배포(로컬). git 커밋·푸시는 사용자 요청 시.

---

# RESULT: musicgen → minimax/music-2.6 교체 — 2026-06-11

## 배경
- 문제: musicgen 은 instrumental — lyrics 가 실제 노래로 안 불림. "멜로디 따로 + 다른 AI 로 노래" 는 비효율.
- 결정(사용자): Replicate 인프라 유지, 보컬 부르는 모델 `minimax/music-2.6` 로 교체. 파이프라인(비동기 예측→폴링→버킷 복사→finalize)은 그대로.
- minimax 입력: `prompt`(필수, 스타일·BPM·키·보컬 묘사 ≤2000자) + `lyrics`(≤3500자, 실제 보컬). **duration 파라미터 없음**(모델이 2~4분 자동, 최대 6분).

## 구현
- **`lib/music.ts`**: `MUSICGEN_MODEL/VERSION`·`DURATION_OPTIONS/DEFAULT_DURATION/DurationSeconds/normalizeDuration` 삭제. `MINIMAX_MODEL="minimax/music-2.6"` 추가. `GenerateRequest` 에서 `duration` 제거, `instrumental?:boolean` 추가. `buildMusicgenInput`→`buildMinimaxInput({prompt,style,lyrics,instrumental})`.
- **`app/api/music/generate/route.ts`**: body `duration`→`instrumental` 파싱. `predictions.create({ model: MINIMAX_MODEL, input: buildMinimaxInput(...) })`. 행 insert: `model:MINIMAX_MODEL`, `duration_seconds:null`, `metadata.{prediction_id,instrumental,lyrics?,style?}`.
- **`app/api/music/[id]/route.ts`**: 출력 파싱 로직 동일(string|array 호환), 주석만 minimax 로 수정.
- **`components/prompt-box.tsx`**: duration UI 제거. `Instrumental` 토글 추가. onSend payload `duration`→`instrumental`.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과(무경고) |
| 타입·컴파일 | `npm run build` | 통과 |
| minimax 스키마 | Replicate 모델 페이지 확인 | prompt/lyrics/is_instrumental/audio_format 검증 |
| 실제 생성 E2E | 로그인 세션 + 실생성 | **미검증(세션 필요)** |

## 교훈
- minimax/music-2.6 은 공식 모델 → `predictions.create` 에 `version` 대신 `model` 이름만 넘기면 됨.
- 길이 제어 불가가 핵심 제약 — 1m/2m/3m UI 제거, 실제 기능인 Instrumental 토글로 교체.
- lyrics 가 이제 진짜 보컬로 불림.

## 배포
- 미배포(로컬). `REPLICATE_API_TOKEN` 은 `.env.local` 만(하드코딩·커밋 금지). git 커밋·푸시는 사용자 요청 시.

---

# RESULT: PromptBox 개편 — Lyrics·Style·Duration — 2026-06-11

## 배경
- 목표: `prompt-box.tsx` 에서 첨부파일/Tools/Mic 제거, 음악 생성 입력 3종 추가.
- 사용자 선택: 전체 연결(컴포넌트→workspace→API→lib). lyrics 는 저장(향후 멜로디+가사 곡으로 발전). style 은 musicgen 프롬프트에 반영. 기존 30초 제거, 1m/2m/3m(기본 1m).

## 구현
- **`lib/music.ts`**: `DURATION_OPTIONS=[60,120,180]`, `DEFAULT_DURATION=60`, `DurationSeconds`/`GenerateRequest` 타입, `normalizeDuration()` 추가. `buildMusicgenInput` 시그니처를 `(prompt, duration)` → `({prompt, style, duration})` 로 변경, style 을 `"Style: ..."` 로 프롬프트에 녹임.
- **`components/prompt-box.tsx`** (재작성): Radix Popover/Dialog/Tooltip·파일첨부·toolsList·Mic 전부 제거. prompt textarea + 토글식 Lyrics(textarea)·Style(input) + 1m/2m/3m segmented + Send. 미니멀 SVG 3종(Send/Lyrics/Style, 영어 라벨). `onSend(payload: GenerateRequest)` 로 시그니처 변경.
- **`components/music-workspace.tsx`**: `handleSend(text)` → `handleSend(payload: GenerateRequest)`, body 에 payload 그대로 전송.
- **`app/api/music/generate/route.ts`**: body 에서 `lyrics`/`style`/`duration` 파싱·검증(`normalizeDuration`). `buildMusicgenInput({prompt,style,duration})`, 행 insert 에 `duration_seconds` + `metadata.{lyrics,style}` 보관.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과(무경고) |
| 타입·컴파일 | `npm run build` | 통과 |
| 실제 생성 E2E | 로그인 세션 + 실생성 | **미검증(세션 필요)** |

## 교훈
- musicgen 은 instrumental — lyrics 입력은 멜로디에 안 들어감. 현재는 `metadata.lyrics` 보관만, 향후 Replicate 다른 API 로 멜로디+가사 결합 예정.
- style 은 prompt 텍스트에 `"Style: x"` 로 합쳐 멜로디 힌트로 사용.
- `onSend` 계약을 string→객체로 바꾸면 소비자(workspace)·API 도 함께 수정해야 빌드 통과.

## 배포
- 미배포(로컬 개발). git 커밋·푸시는 사용자 요청 시.

---

# RESULT: AI 음악 생성 (프롬프트 → Replicate musicgen) — 2026-06-11

## 배경
- 목표: 워크스페이스 프롬프트 입력으로 실제 음악을 생성·재생.
- 모델: Replicate `meta/musicgen` (stereo-large, mp3). 토큰은 `.env.local` `REPLICATE_API_TOKEN`.
- 설계 결정(사용자 선택): **비동기 + 폴링** 생성, 생성된 mp3 를 **InsForge `musics` 버킷에 복사**(Replicate URL 은 TTL 만료).

## 구현
- **`lib/music.ts`** (신규): `MUSICGEN_VERSION`/`MUSICGEN_MODEL`/`MUSICS_BUCKET` 상수, `buildMusicgenInput(prompt, duration=30)`, `deriveTitle(prompt)`, `Music` 타입/`MusicStatus`. `DEFAULT_DURATION=30`(musicgen 기본 8초 → 상향).
- **`app/api/music/generate/route.ts`** (신규, POST): 인증(`createServerClient`) → Replicate `predictions.create` 로 예측 시작(논블로킹) → `musics` 행 `status:'processing'` + `metadata.prediction_id` insert → `{ music }` 반환.
- **`app/api/music/[id]/route.ts`** (신규, GET 폴링): 행 조회 → 종료상태면 즉시 반환 → `predictions.get` 확인 → 성공 시 mp3 fetch → `new File(...)` 로 `musics` 버킷 업로드(`{user_id}/{id}.mp3`) → 행 `completed` + `audio_url`/`audio_key` 업데이트. 실패/취소/빈출력은 `markFailed`. 동적 파라미터는 `await ctx.params` (Next 16).
- **`components/music-workspace.tsx`** (신규, 클라): `PromptBox` 래핑 + 트랙 카드 목록. 전송 → generate 호출 → 3초 간격 폴링(완료/실패까지) → 상태 배지·오디오 플레이어·스피너·에러 렌더. 에러는 상태코드+본문 노출.
- **`app/workspace/page.tsx`** (수정): 빈 `PromptBox` → `MusicWorkspace` 렌더.
- 의존성: `replicate@1.4.0` 설치.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npx tsc --noEmit` | 통과 |
| 라우트 컴파일 | `npm run build` (두 라우트 + 타입) | 통과 |
| Replicate 자격 | 토큰 + 모델 버전 GET 200 | 통과 |
| 미인증 가드 | `POST /api/music/generate` 무인증 → 401 | 통과 |
| 실제 생성 E2E | 로그인 세션 + ~60초 실생성 | **미검증(세션 필요)** |

## 교훈
- musicgen `duration` 미지정 시 기본 8초 → 입력에 명시 필요(상한은 스키마에 없음).
- 비동기 패턴: `replicate.run`(블로킹) 대신 `predictions.create`/`get` 으로 긴 요청 회피, 클라가 폴링.
- Replicate 출력 URL 은 임시 → 영구 보관하려면 mp3 를 Storage 로 복사하고 `url`+`key` 저장(InsForge 규약).
- Next 16 라우트 핸들러 동적 파라미터는 Promise — `await ctx.params`, 타입은 `RouteContext<'/api/music/[id]'>`.
- Next 에러 오버레이는 객체 2번째 인자를 `{}` 로 뭉갬 → 클라에서 상태코드+raw 텍스트를 직접 찍어야 진짜 사유 파악.

## 배포
- 미배포(로컬 개발 단계). git 커밋·푸시는 사용자 요청 시.

---

(아직 보관된 과거 세션 없음)
