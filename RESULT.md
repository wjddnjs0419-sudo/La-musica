# RESULT: musicgen → minimax/music-2.6 교체 — 2026-06-11

## 배경
- 문제: musicgen 은 instrumental — lyrics 가 실제 노래로 안 불림. "멜로디 따로 + 다른 AI 로 노래" 는 비효율.
- 결정(사용자): Replicate 인프라 유지, 보컬 부르는 모델 `minimax/music-2.6` 로 교체. 파이프라인(비동기 예측→폴링→버킷 복사→finalize)은 그대로.
- minimax 입력: `prompt`(필수, 스타일·BPM·키·보컬 묘사 ≤2000자) + `lyrics`(≤3500자, 실제 보컬). **duration 파라미터 없음**(모델이 2~4분 자동, 최대 6분).

## 구현
- **`lib/music.ts`**: `MUSICGEN_MODEL/VERSION`·`DURATION_OPTIONS/DEFAULT_DURATION/DurationSeconds/normalizeDuration` 삭제. `MINIMAX_MODEL="minimax/music-2.6"` 추가(공식 모델 — 버전 해시 불필요). `GenerateRequest` 에서 `duration` 제거, `instrumental?:boolean` 추가. `buildMusicgenInput`→`buildMinimaxInput({prompt,style,lyrics,instrumental})`: style 을 `"Style: x"` 로 prompt 병합(≤2000 slice), instrumental 이면 lyrics 생략+`is_instrumental:true`, 아니면 lyrics 포함(≤3500 slice), `audio_format:"mp3"`.
- **`app/api/music/generate/route.ts`**: body `duration`→`instrumental`(`=== true`) 파싱. `predictions.create({ model: MINIMAX_MODEL, input: buildMinimaxInput(...) })`. 행 insert: `model:MINIMAX_MODEL`, `duration_seconds:null`, `metadata.{prediction_id,instrumental,lyrics?,style?}`.
- **`app/api/music/[id]/route.ts`**: 출력 파싱 로직 동일(string|array 호환), 주석만 minimax 로 수정.
- **`components/prompt-box.tsx`**: duration import/state/segmented 제거. `instrumental` state + `InstrumentalIcon` + ml-auto 영역에 Instrumental 토글 버튼(aria-pressed). onSend payload `duration`→`instrumental`, 제출 후 `setInstrumental(false)` 리셋. Style 필드는 유지.

## Verification Matrix
| Change | Checks | Result |
|---|---|---|
| 전체 코드 | `npm run lint` | 통과(무경고) |
| 타입·컴파일 | `npm run build` | 통과 |
| minimax 스키마 | Replicate 모델 페이지 확인 | prompt/lyrics/is_instrumental/audio_format 검증 |
| 실제 생성 E2E | 로그인 세션 + 실생성 | **미검증(세션 필요)** |

## 교훈
- minimax/music-2.6 은 공식 모델 → `predictions.create` 에 `version` 대신 `model` 이름만 넘기면 됨(버전 해시 핀 불필요).
- 길이 제어 불가가 핵심 제약 — 1m/2m/3m UI 는 거짓말이 되어 제거, 대신 사용자 선택으로 실제 기능인 Instrumental 토글로 교체.
- lyrics 가 이제 진짜 보컬로 불림 → `metadata.lyrics` 보관만 하던 musicgen 대비 핵심 개선.
- 빈 lyrics + instrumental 둘 다 처리: `buildMinimaxInput` 에서 instrumental 이거나 lyrics 없으면 lyrics 키 자체를 omit.

## 배포
- 미배포(로컬). `REPLICATE_API_TOKEN` 은 `.env.local` 만(하드코딩·커밋 금지). git 커밋·푸시는 사용자 요청 시.
