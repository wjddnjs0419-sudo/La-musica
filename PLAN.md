# PLAN.md

Completed work is summarized in `RESULT.md`. Keep this file to active/planned work only. Done items are one-line `[Done]` summaries; keep at most 10 and remove the oldest first.

## Pending Approval
(none)

## In Progress
(none)

## Done
- [Done] Landing mobile background consistency (2026-06-16) - Normalized the homepage base background, moved ambient gradients into landing CSS with a mobile-specific variant, deployed to Vercel, and verified the live response. build/lint passed. See RESULT.md.
- [Done] Google OAuth production redirect fix (2026-06-16) - Added the Vercel callback URL to InsForge allowed redirects, applied backend config, and verified OAuth start redirects to Google. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Vercel production publishing (2026-06-16) - Created/linked `la-musica`, synced production env vars, deployed to `https://la-musica.vercel.app`, and verified the live homepage. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Main/workspace mobile optimization (2026-06-16) - Added the homepage mobile hamburger side menu, tuned landing/workspace mobile layouts, simplified the workspace avatar button, and fixed mobile dropdown tap behavior. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Landing fixed generated sample tracks (2026-06-16) - Pinned the current four generated song IDs, fetches title/audio/thumbnail/prompt from InsForge for the landing sample section, and verified build/lint plus local response content. See RESULT_ARCHIVE.md.
- [Done] AI music thumbnail generation (2026-06-16) - Added post-success Replicate Flux Schnell album-cover thumbnails for new songs only, stored thumbnail fields in `musics`, preserved fallback artwork for old/failed thumbnails, and verified migration/build/lint. See RESULT_ARCHIVE.md.
- [Done] Landing pricing anchor and sample music gallery (2026-06-16) - Connected Header Pricing to `#pricing`, added a Tailwind-only sample music section above pricing with local WAV previews and centered SVG play controls, and verified build/lint plus asset responses. See RESULT_ARCHIVE.md.
- [Done] Pricing section credit checkout wiring (2026-06-14) - Connected main-page pricing Get credits buttons to `/api/credits/checkout`, using the same Polar credit plan IDs and redirect/error handling pattern as workspace Upgrade. build/lint passed. See RESULT_ARCHIVE.md.
- [Done] Origin main update merge (2026-06-14) - Fast-forwarded to `e4be16a`, restored local stashed work, resolved document and credit modal conflicts, kept Polar checkout wiring, and verified build/lint. See RESULT_ARCHIVE.md.
- [Done] Main-page LineWaves CTA section (2026-06-13) - Ported reactbits `LineWaves` (OGL) into `components/LineWaves.tsx`, built `components/cta-section.tsx` as a full-width section with the shader as a `pointer-events-none -z-10` background and a centered copy + reused GetStartedBadge overlay; wired below HeroSection in `app/page.tsx`. Added `ogl` dep. build/lint passed. See RESULT_ARCHIVE.md.

## Future / Later
(none)
