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
