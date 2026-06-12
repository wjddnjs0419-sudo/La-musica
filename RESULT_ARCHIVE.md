# RESULT_ARCHIVE.md

과거 세션 RESULT 누적(최신이 위). 신규 완료는 `RESULT.md` 에 작성하고, 다음 작업 시작 시 직전 `RESULT.md` 내용을 이 파일 상단으로 옮김.

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
