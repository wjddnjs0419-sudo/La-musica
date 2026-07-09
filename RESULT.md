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
