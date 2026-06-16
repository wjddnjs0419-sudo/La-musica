# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Aggressive genre presets (scene/era/commercial framing) (2026-06-16) - Rewrote all 9 GENRE_PRESETS from cautious generics to scene/era/commercial-anchored language (name-free), expanded REFERENCE_MAP with 4 more name→descriptor mappings, kept COPYRIGHT_LINE, added a regression test that presets never name a banned artist. TDD RED→GREEN; test 38/lint/build passed; 01_GENRE_PRESETS.md synced. See RESULT.md.
- [Done] Genre reference analysis and preset tuning (2026-06-16) - Added prompt-safe reference-analysis docs for all current Genre dropdown options, tuned runtime genre presets with conservative arrangement details, synced ChatGPT Project genre docs, and updated tests. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] ChatGPT Project knowledge files (2026-06-16) - Created four upload-ready docs under `docs/chatgpt-project/` from current La Musica source-of-truth: genre presets, actual lyrics payload/tag rules, prompt compiler rules, and product decisions. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Prompt box simplification and lyricless vocal handling (2026-06-16) - Removed the redundant Style input/request path, kept lyrics optional, added explicit original-lyrics guidance for vocal modes without user lyrics, and switched thumbnail genre hints from removed `metadata.style` to `metadata.genre`. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Music prompt compiler quality tuning (2026-06-16) - Made user prompt/lyrics primary, demoted Genre/Mood/Use-case into lower-authority guidance, rewrote genre/reference presets with concrete rhythm/drum/bass/instrumentation details without forcing vocal/instrumental mode, bumped compiler version to v2, and updated tests/docs. test/build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Insufficient credit UX upgrade (2026-06-16) - Replaced raw `insufficient_credit` with `Not enough credits. Please upgrade.`, opened the existing centered Upgrade modal directly from failed generation attempts, and moved workspace credit-modal state into a shared client shell. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Manual starter credit grant (2026-06-16) - Verified `kkw0628001@gmail.com` maps to `84adcde6-126e-4a36-b3a9-ad0fc9a30896`, inserted one paid manual payment ledger row (`provider_payment_id=manual-starter-20260616-84adcde6`) for 5 credits / `$2.99`, upserted `public.user_credits` to 5, and recorded verification. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Music Prompt Compiler (2026-06-16) - Added `lib/music-prompt/` pure module (presets/sanitizer/lyrics/compiler, vitest) that compiles simple user intent + Genre/Mood/Use-case/Vocal options into a high-quality English MiniMax prompt server-side; wired into the generate route with compiled metadata stored in `musics.metadata`; added structured option chips to the prompt box (Instrumental folded into Vocal select); docs in `docs/MINIMAX_PROMPT_ENGINEERING.md`. 26 vitest pass, build/lint/tsc clean. See RESULT_ARCHIVE.md.
- [Done] Landing footer section (2026-06-16) - Added a mobile-optimized La Musica footer with product links, Privacy Policy and Terms of Service links, subtle wordmark styling, and x-only landing overflow clipping. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Legal page contact email update (2026-06-16) - Updated Privacy Policy and Terms of Service contact emails to `wjddnjs0419@hufs.ac.kr`; build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
