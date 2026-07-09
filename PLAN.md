# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Contact page and navigation link - Add a `/contact` page using existing La Musica styling/components, wire the main menu Contact link to it, and validate with build/lint.

## Done
- [Done] Gemini 무료티어 RPM 경합으로 인한 동시 사용 실패 수정 (2026-07-10) - 번역/정제/제목/가사 어시스턴트가 공유하는 `GEMINI_API_KEY` 무료티어(15 RPM) 경합이 원인. 공유 `fetchGeminiWithRetry`(429 백오프+타임아웃)를 번역/정제/가사 어시스턴트 3곳에 적용, 제목 생성은 Gemini 호출 자체를 없애고 로컬 휴리스틱으로 전환(곡 생성당 Gemini 호출 항상 최대 2콜: 번역+정제). vitest 62/lint/build 통과. 커밋/배포는 사용자. See RESULT.md.
- [Done] Workspace mobile scroll stability (2026-06-18) - Stabilized mobile workspace scrolling by moving AI Lyrics Assistant to a portal with body scroll lock, using `100dvh`/`min-h-0`/`overscroll-contain`, making Upgrade modal internally scrollable, and capping prompt composer expansion. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] 정제 전/후 프롬프트 효과 실측 + 저작권 중복·타임아웃 수정 (2026-06-17) - InsForge SQL 로 `musics.metadata` 정제 전/후 6건 실측: 정제 4건 평균 ~30% 압축 + BPM/key 보강(양성), 폴백 33%(2/6), 저작권 의역 시 캐논 중복(2/4). `finalizeRefined` 재작성(캐논 부분문자열 제거→의역 절 strip→1회 부착, 음악내용 없으면 폴백) + system prompt 저작권 출력금지화 + `refineStylePrompt` 8s AbortController 타임아웃. vitest 49(RED→GREEN)/lint/build 통과. See RESULT_ARCHIVE.md.
- [Done] HelloTalk beta coupon credits (2026-06-18) - Added authenticated `HELLOTALK-BETA` coupon redemption for 1 song credit with 20 max redemptions, server-side atomic RPC, Upgrade modal UI, coupon ledger tracking, and default signup free-credit disabled. migration/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Lyrics-based title generation and title-centered covers (2026-06-18) - New songs no longer derive titles from prompt text; lyric-backed songs use Gemini after auth/credit checks, instrumental/lyricless songs use genre/mood fallbacks, and thumbnail prompts now center the saved title. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Auth-aware landing CTA label (2026-06-18) - Returning signed-in users now see `Open Workspace` on landing CTAs that already route to `/workspace`, while anonymous users keep `Get Started` to `/auth`. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Style prompt 정제(Gemini) + 가사 태그 동기화 + UI/인증 수정 (2026-06-17) - 신규 `lib/refineStylePrompt.ts` 가 컴파일된 프롬프트를 Gemini 로 응집 재작성(프리셋=가드레일, 번역과 별도 콜, 실패 시 폴백) 후 generate 라우트에서 `compile→정제→MiniMax` 연결·메타에 정제 전/후 둘 다 저장. 가사 어시스턴트 태그를 `CANON_TAGS` 와 동기화 + `CANONICAL_SECTION_TAGS` export + 가드 테스트. `window.prompt/confirm` 미지원 → 인라인 rename·2단계 delete(`resolveRenameTitle` TDD). 가사 라우트 갱신 토큰 `setAuthCookies` persist(세션 silent 만료 수정). vitest 46/lint/build 통과. See RESULT_ARCHIVE.md.
- [Done] Pricing update — Viral 35곡 + Free 가입 1곡 지급 (2026-06-17) - `lib/credits.ts` viral-pack 50→35, 신규 마이그레이션으로 `fulfill_polar_credit_order` RPC 맵 동기화 + 멱등 `grant_free_credit()` 추가, OAuth 콜백에서 신규 유저 무료 1곡 지급, dead Stripe 마이그레이션 삭제. Trial 생략·가격 동일(Polar 제품 불필요). build/lint/마이그레이션 적용/prod 배포 완료. See RESULT_ARCHIVE.md.
- [Done] Aggressive genre presets (scene/era/commercial framing) (2026-06-16) - Rewrote all 9 GENRE_PRESETS from cautious generics to scene/era/commercial-anchored language (name-free), expanded REFERENCE_MAP with 4 more name→descriptor mappings, kept COPYRIGHT_LINE, added a regression test that presets never name a banned artist. TDD RED→GREEN; test 38/lint/build passed; 01_GENRE_PRESETS.md synced. See RESULT_ARCHIVE.md.
- [Done] Genre reference analysis and preset tuning (2026-06-16) - Added prompt-safe reference-analysis docs for all current Genre dropdown options, tuned runtime genre presets with conservative arrangement details, synced ChatGPT Project genre docs, and updated tests. test/build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
