# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Contact page and navigation link - Add a `/contact` page using existing La Musica styling/components, wire the main menu Contact link to it, and validate with build/lint.

## Done
- [Done] HelloTalk beta coupon credits (2026-06-18) - Added authenticated `HELLOTALK-BETA` coupon redemption for 1 song credit with 20 max redemptions, server-side atomic RPC, Upgrade modal UI, coupon ledger tracking, and default signup free-credit disabled. migration/build/lint passed. See RESULT.md.
- [Done] Lyrics-based title generation and title-centered covers (2026-06-18) - New songs no longer derive titles from prompt text; lyric-backed songs use Gemini after auth/credit checks, instrumental/lyricless songs use genre/mood fallbacks, and thumbnail prompts now center the saved title. test/build/lint passed. See RESULT.md.
- [Done] Auth-aware landing CTA label (2026-06-18) - Returning signed-in users now see `Open Workspace` on landing CTAs that already route to `/workspace`, while anonymous users keep `Get Started` to `/auth`. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Pricing update — Viral 35곡 + Free 가입 1곡 지급 (2026-06-17) - `lib/credits.ts` viral-pack 50→35, 신규 마이그레이션으로 `fulfill_polar_credit_order` RPC 맵 동기화 + 멱등 `grant_free_credit()` 추가, OAuth 콜백에서 신규 유저 무료 1곡 지급, dead Stripe 마이그레이션 삭제. Trial 생략·가격 동일(Polar 제품 불필요). build/lint/마이그레이션 적용/prod 배포 완료. See RESULT_ARCHIVE.md.
- [Done] Aggressive genre presets (scene/era/commercial framing) (2026-06-16) - Rewrote all 9 GENRE_PRESETS from cautious generics to scene/era/commercial-anchored language (name-free), expanded REFERENCE_MAP with 4 more name→descriptor mappings, kept COPYRIGHT_LINE, added a regression test that presets never name a banned artist. TDD RED→GREEN; test 38/lint/build passed; 01_GENRE_PRESETS.md synced. See RESULT_ARCHIVE.md.
- [Done] Genre reference analysis and preset tuning (2026-06-16) - Added prompt-safe reference-analysis docs for all current Genre dropdown options, tuned runtime genre presets with conservative arrangement details, synced ChatGPT Project genre docs, and updated tests. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] ChatGPT Project knowledge files (2026-06-16) - Created four upload-ready docs under `docs/chatgpt-project/` from current La Musica source-of-truth: genre presets, actual lyrics payload/tag rules, prompt compiler rules, and product decisions. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Prompt box simplification and lyricless vocal handling (2026-06-16) - Removed the redundant Style input/request path, kept lyrics optional, added explicit original-lyrics guidance for vocal modes without user lyrics, and switched thumbnail genre hints from removed `metadata.style` to `metadata.genre`. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Music prompt compiler quality tuning (2026-06-16) - Made user prompt/lyrics primary, demoted Genre/Mood/Use-case into lower-authority guidance, rewrote genre/reference presets with concrete rhythm/drum/bass/instrumentation details without forcing vocal/instrumental mode, bumped compiler version to v2, and updated tests/docs. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Insufficient credit UX upgrade (2026-06-16) - Replaced raw `insufficient_credit` with `Not enough credits. Please upgrade.`, opened the existing centered Upgrade modal directly from failed generation attempts, and moved workspace credit-modal state into a shared client shell. build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
