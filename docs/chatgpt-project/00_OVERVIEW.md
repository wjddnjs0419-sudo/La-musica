# La Musica — Compressed Overview (ChatGPT planning)

**One line**: Text prompt → AI music (vocals + instrumentation) web app. Credit model (1 credit/song), prepaid.

## Stack
- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4
- Backend: **InsForge** (Postgres BaaS) — auth / DB / storage / payments
- Music: **Replicate `minimax/music-2.6`**; Thumbnail: **Replicate `flux-schnell`**
- Translation: Gemini REST (`gemini-2.5-flash-lite`)

## Core pipeline (music generation)
1. Prompt box → `POST /api/music/generate`
2. Free text → **English translation** (non-ASCII only; falls back to original on failure)
3. **Prompt compiler** (`lib/music-prompt/`): user intent leads + genre/mood/use-case/vocal presets added as lower-authority guidance → dense English prompt. Always appends copyright-safety line; sanitizer replaces artist names with descriptors.
4. `create_music_with_credit` RPC: atomic — deduct 1 credit + insert `musics` row as `processing`
5. Start Replicate prediction → on failure `refund_failed_music_credit`
6. Client polls `GET /api/music/[id]` → on success copy mp3 into `musics` bucket (avoid Replicate TTL), finalize row
7. After completion, async thumbnail generation (1:1 webp)

## Prompt compiler (differentiator)
- Output: `{ prompt, lyrics?, instrumental, metadata }`, version `v2`
- Option inputs: 9 genres, 12 moods (top 2 applied), 11 use-cases, 6 vocal modes (`auto` resolved), language
- Rules: user prompt = highest authority, genre = secondary, mood = shading, per-vocal-mode booster, if no lyrics → instruct model to generate original lyrics
- Safety: no artist/song names — scene/era/commercial framing only

## Data / payments
- Tables: `musics` (RLS: owner or public read), `user_credits`, `payments` (ledger)
- Payments: **Polar only** (`lib/credits.ts`: Starter $2.99/5, Creator $7.99/20, Viral Pack $14.99/50). UI → `POST /api/credits/checkout` → Polar hosted checkout → `app/api/webhooks/polar/` fulfillment grants credits. Product ids from env (`POLAR_*_PRODUCT_ID`).
- Credit deduct/refund all via DB RPC (admin client)

## Auth
- InsForge SSR — server `createServerClient({cookies})`, Google OAuth, refresh via `/api/auth/refresh`

## Not built / candidates
- Language select UI (compiler already supports `sung in {language}`; UI hardcodes `undefined`)
- No song-length control (model decides, ~2–6 min)
