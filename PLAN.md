# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Main-page LineWaves CTA section (2026-06-13) - Ported reactbits `LineWaves` (OGL) into `components/LineWaves.tsx`, built `components/cta-section.tsx` as a full-width section with the shader as a `pointer-events-none -z-10` background and a centered copy + reused GetStartedBadge overlay; wired below HeroSection in `app/page.tsx`. Added `ogl` dep. build/lint passed. See RESULT.md.
- [Done] Workspace track list pagination (2026-06-13) - Limited the track list to 7 per page with white `<`/`>` SVG controls, render-time page clamp + query reset (no setState-in-effect), and smooth scroll-to-top on page change. build/lint passed. See RESULT.md.
- [Done] InsForge credit/payments schema (2026-06-12) - Added `public.user_credits.credit` and minimal `public.payments` ledger through migration `20260612055742_add-credit-and-payments.sql`; applied with InsForge CLI, DB catalog checks passed, build/lint passed. See RESULT.md.
- [Done] Credit modal entry from profile popover (2026-06-12) - Added Upgrade popover action with minimal music-note SVG and a Tailwind, React Portal credit modal showing Starter/Creator/Viral Pack price and song credits. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Music card metadata cleanup (2026-06-12) - Hid pending/processing card metadata, removed the `*` duration/date separator, and kept build/lint passing. See RESULT_ARCHIVE.md.
- [Done] Music card duration fallback fix (2026-06-12) - Replaced hardcoded `1:00` fallback with `--:--`, synced real audio metadata duration back to DB, and kept build/lint passing. See RESULT_ARCHIVE.md.
- [Done] Workspace player immediate playback/full-width controls (2026-06-12) - Fixed first-click playback, widened the player, refined seek/progress UI, and removed glow/shadow effects. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Workspace bottom linked music player (2026-06-11) - Added the PromptBox-linked bottom player with shared card/player playback, seek, volume, and fallback thumbnail handling. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Workspace search section icon cleanup (2026-06-11) - Removed duplicate centered SearchInput, wired navbar search filtering, and replaced the profile trigger with a hero SVG. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Workspace DB song list/actions (2026-06-11) - Displayed stored `musics`, added search/filter UI plus rename/download/delete menu, and reflected DB updates immediately. build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
(none)
