# RESULT_ARCHIVE.md

과거 세션 RESULT 누적(최신이 위). 신규 완료는 `RESULT.md` 에 작성하고, 다음 작업 시작 시 직전 `RESULT.md` 내용을 이 파일 상단으로 옮김.

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
