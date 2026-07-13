# RESULT: 앨범 커버 미반영 버그 수정 - 2026-07-13

## Background
사용자(`jake051096@gmail.com`)가 가장 최근 생성한 곡 "This is the sound"의 앨범 커버가 워크스페이스에 반영되지 않는다는 신고. Replicate 쪽 로그에서는 이미지 생성이 성공한 것으로 보였으나 DB에는 반영 안 됨. `insforge-debug` 스킬로 DB를 직접 조회해 확인:
- 해당 곡만 `thumbnail_status = "pending"`, `thumbnail_url`/`thumbnail_key`가 `null`로 멈춰 있었음 (전체 완료곡 48개 중 47개는 `succeeded` — 이번 건 1건만 발생한 케이스).

## Root Cause
`app/api/music/[id]/route.ts`의 finalize 경로에서 썸네일 생성을 `await` 없이 던지는 fire-and-forget 방식으로 실행:
```ts
generateAndPersistThumbnail(client, user.id, updated[0] as Music, thumbnailPrompt).catch(...);
```
Vercel 서버리스 함수는 `NextResponse.json(...)` 응답이 나가는 순간 함수를 종료/freeze할 수 있어, Replicate 이미지 생성(1단계)은 끝났더라도 이후 다운로드→Storage 업로드→DB 업데이트(2~4단계)가 마무리되기 전에 함수가 죽으면 `thumbnail_status`가 영원히 `pending`에 멈춘다. 같은 파일의 가사 싱크 백그라운드 작업(`ensureLyricsSyncStarted`)은 이미 `next/server`의 `after()`로 감싸 이 문제를 피하고 있었는데, 썸네일 쪽만 그 패턴이 빠져 있었다. 완료된 트랙에 대해 썸네일 재시도를 거는 경로도 없어서(가사 싱크와 달리) 한 번 이렇게 멈추면 자동 복구되지 않았다.

## Implementation

### Fix — 썸네일 생성을 `after()`로 스케줄링
- 신규 모듈 `lib/image/ensureThumbnail.ts`: 기존 route.ts에 인라인으로 있던 `generateAndPersistThumbnail`(Replicate 호출 → Storage 업로드 → DB 반영, 실패 시 `thumbnail_status: "failed"` 기록)을 그대로 옮기고, 이를 `after()`로 감싸는 `scheduleThumbnailGeneration(client, userId, music, prompt)`를 새로 export — `lib/lyrics/ensureLyricsSync.ts`의 `after()` 패턴과 동일 구조.
- `app/api/music/[id]/route.ts`는 이제 `scheduleThumbnailGeneration(...)`만 호출. vitest는 `lib/**/*.test.ts`만 실행하도록 설정돼 있어(`vitest.config.ts`) route.ts 자체는 단위 테스트 대상이 아니므로, 테스트 가능하도록 로직을 `lib/`로 추출하는 이 저장소의 기존 컨벤션을 따랐다.
- TDD: `lib/image/ensureThumbnail.test.ts`를 먼저 작성(모듈 부재로 RED 확인) → 최소 구현으로 GREEN. 커버 항목: (1) `after()`로 스케줄만 되고 즉시 실행되지 않는지, (2) 성공 시 `thumbnail_url`/`thumbnail_key`/`thumbnail_status: "succeeded"`가 올바른 id로 반영되는지, (3) 생성 실패 시 `thumbnail_status: "failed"`로 기록되어 `pending`에 방치되지 않는지.

### 데이터 복구 (1회성)
자동 재시도 경로가 없어 DB 값을 되돌리는 것만으로는 반영되지 않으므로, 로컬에서 1회성 스크립트로 해당 레코드의 기존 `thumbnail_prompt`를 재사용해 Replicate(`flux-schnell`) 이미지를 다시 생성하고 InsForge admin 클라이언트로 Storage 업로드 + DB 업데이트(`thumbnail_url`/`thumbnail_key`/`thumbnail_status: "succeeded"`)까지 직접 수행. 실행 후 스크립트 파일은 삭제, DB 조회로 반영 확인 완료.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 신규 유닛 테스트 | `npx vitest run lib/image/ensureThumbnail.test.ts` | RED(모듈 없음) 확인 → GREEN(3 tests) |
| 전체 단위 테스트 | `npm run test` | Passed (20 files / 144 tests) |
| 타입체크 | `npx tsc --noEmit` | Passed |
| Lint | `npm run lint` | Passed (0 errors, 기존 `FullScreenPlayer` `<img>` warning 1개 유지) |
| Build | `npm run build` | Passed |
| 데이터 복구 확인 | InsForge CLI `db query` (수정 전/후) | `pending`/`null` → `succeeded`/실제 URL 확인 |

## Lessons
- 같은 파일 안에 "제대로 만든 배경 작업"(가사 싱크, `after()` 사용)과 "허술한 배경 작업"(썸네일, bare fire-and-forget)이 나란히 있었다 — 한쪽에 이미 검증된 패턴이 있으면 그 패턴이 다른 유사 작업에도 일관되게 적용됐는지 점검할 가치가 있다.
- 이번 건은 48개 완료곡 중 1개만 발생 — 재현이 안 되는 드문 실패라도 "완료곡 전체에서 몇 건이 같은 상태인지" DB로 직접 세어보면 회귀 가능성 있는 버그인지 일회성 우연인지 바로 구분된다.
- 이 프로젝트는 vitest가 `lib/**/*.test.ts`만 대상으로 하므로, route 핸들러에 로직을 인라인으로 두면 TDD를 못 걸고 넘어가기 쉽다 — 라우트 파일은 얇게 유지하고 오케스트레이션 로직은 `lib/`로 빼는 습관이 곧 테스트 가능성을 보장한다.
