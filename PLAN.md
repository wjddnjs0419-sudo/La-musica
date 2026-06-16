# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
- Prompt box simplification and lyricless vocal handling - Remove the redundant Style input/request path, keep lyrics optional, and add explicit prompt guidance when a vocal mode is selected without user-provided lyrics.

## Done
- [Done] Music prompt compiler quality tuning (2026-06-16) - Made user prompt/lyrics primary, demoted Genre/Mood/Use-case into lower-authority guidance, rewrote genre/reference presets with concrete rhythm/drum/bass/instrumentation details without forcing vocal/instrumental mode, bumped compiler version to v2, and updated tests/docs. test/build/lint passed. See RESULT.md.
- [Done] Insufficient credit UX upgrade (2026-06-16) - Replaced raw `insufficient_credit` with `Not enough credits. Please upgrade.`, opened the existing centered Upgrade modal directly from failed generation attempts, and moved workspace credit-modal state into a shared client shell. build/lint passed. See RESULT.md.
- [Done] Manual starter credit grant (2026-06-16) - Verified `kkw0628001@gmail.com` maps to `84adcde6-126e-4a36-b3a9-ad0fc9a30896`, inserted one paid manual payment ledger row (`provider_payment_id=manual-starter-20260616-84adcde6`) for 5 credits / `$2.99`, upserted `public.user_credits` to 5, and recorded verification. build/lint passed. See RESULT.md.
- [Done] Music Prompt Compiler (2026-06-16) - Added `lib/music-prompt/` pure module (presets/sanitizer/lyrics/compiler, vitest) that compiles simple user intent + Genre/Mood/Use-case/Vocal options into a high-quality English MiniMax prompt server-side; wired into the generate route with compiled metadata stored in `musics.metadata`; added structured option chips to the prompt box (Instrumental folded into Vocal select); docs in `docs/MINIMAX_PROMPT_ENGINEERING.md`. 26 vitest pass, build/lint/tsc clean. See RESULT.md.
- [Done] Landing footer section (2026-06-16) - Added a mobile-optimized La Musica footer with product links, Privacy Policy and Terms of Service links, subtle wordmark styling, and x-only landing overflow clipping. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Legal page contact email update (2026-06-16) - Updated Privacy Policy and Terms of Service contact emails to `wjddnjs0419@hufs.ac.kr`; build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Landing mobile background consistency (2026-06-16) - Normalized the homepage base background, moved ambient gradients into landing CSS with a mobile-specific variant, deployed to Vercel, and verified the live response. build/lint passed. See RESULT.md.
- [Done] Google OAuth production redirect fix (2026-06-16) - Added the Vercel callback URL to InsForge allowed redirects, applied backend config, and verified OAuth start redirects to Google. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Vercel production publishing (2026-06-16) - Created/linked `la-musica`, synced production env vars, deployed to `https://la-musica.vercel.app`, and verified the live homepage. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Main/workspace mobile optimization (2026-06-16) - Added the homepage mobile hamburger side menu, tuned landing/workspace mobile layouts, simplified the workspace avatar button, and fixed mobile dropdown tap behavior. build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
- 언어 선택 UI 드롭다운 추가 — prompt-box에 Language 선택 컨트롤 추가해 `GenerateRequest.language` 를 실제로 전송. 컴파일러는 이미 vocal 모드에서 `sung in {language}` 주입을 지원함(현재 UI는 `language: undefined` 하드코딩 상태). 한국어/스페인어/프랑스어/영어 등 옵션 + Auto.
