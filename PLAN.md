# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Landing pricing anchor and sample music gallery (2026-06-16) - Connected Header Pricing to `#pricing`, added a Tailwind-only sample music section above pricing with local WAV previews and centered SVG play controls, and verified build/lint plus asset responses. See RESULT.md.
- [Done] Pricing section credit checkout wiring (2026-06-14) - Connected main-page pricing Get credits buttons to `/api/credits/checkout`, using the same Polar credit plan IDs and redirect/error handling pattern as workspace Upgrade. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Origin main update merge (2026-06-14) - Fast-forwarded to `e4be16a`, restored local stashed work, resolved document and credit modal conflicts, kept Polar checkout wiring, and verified build/lint. See RESULT_ARCHIVE.md.
- [Done] Main-page LineWaves CTA section (2026-06-13) - Ported reactbits `LineWaves` (OGL) into `components/LineWaves.tsx`, built `components/cta-section.tsx` as a full-width section with the shader as a `pointer-events-none -z-10` background and a centered copy + reused GetStartedBadge overlay; wired below HeroSection in `app/page.tsx`. Added `ogl` dep. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Workspace track list pagination (2026-06-13) - Limited the track list to 7 per page with white `<`/`>` SVG controls, render-time page clamp + query reset (no setState-in-effect), and smooth scroll-to-top on page change. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Music generation API auth refresh fix (2026-06-12) - Added refresh-token recovery inside `/api/music/generate` so expired access cookies retry auth and write refreshed cookies before generation. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Manual credit grant and workspace credit display (2026-06-12) - Granted 100 manual credits to `jake051096@gmail.com`, moved Instrumental beside Style, added DB-synced remaining credit display, and flattened the credit indicator styling. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Minimal Polar fulfillment and credit spending (2026-06-12) - Added signed `order.paid` webhook handling, Polar payment recording, plan-based credit top-ups, and 1-credit spending for music generation. Migration applied, build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Polar credit checkout session wiring (2026-06-12) - Connected credit modal plan buttons to `/api/credits/checkout`, created server-side Polar checkout sessions from env product IDs, verified product IDs, unauthorized guard, build, and lint. See RESULT_ARCHIVE.md.
- [Done] InsForge credit/payments schema (2026-06-12) - Added `public.user_credits.credit` and minimal `public.payments` ledger through migration `20260612055742_add-credit-and-payments.sql`; applied with InsForge CLI, DB catalog checks passed, build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
(none)
