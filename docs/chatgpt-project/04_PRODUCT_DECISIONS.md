# 04_PRODUCT_DECISIONS

Source of truth: current app code, `PLAN.md`, `RESULT.md`, `RESULT_ARCHIVE.md`, `lib/credits.ts`, music generation routes.

Purpose: Use this file as ChatGPT Project context when making product, UX, pricing, or implementation suggestions for La Musica.

## Core Product Principle

La Musica hides prompt engineering inside the service.

Users should describe music simply. They should not need to understand MiniMax prompt engineering, dense production jargon, or copyright-safe reference rewriting.

The app owns:

- prompt translation
- prompt compilation
- genre/mood/use-case expansion
- vocal/instrumental branching
- reference sanitization
- MiniMax input assembly

The user-facing prompt box stays simple.

## Current User Inputs

Prompt box supports:

- Main prompt: required
- Lyrics: optional
- Options panel:
  - Genre
  - Vocal
  - Language
  - Use case
  - Mood chips

Removed:

- Separate Style input was removed because style belongs in the main prompt or structured options.

## Credits Policy

Generating music consumes credits.

Current purchasable credit plans:

- Starter: `$2.99`, 5 songs
- Creator: `$7.99`, 20 songs
- Viral Pack: `$14.99`, 50 songs

Payment provider: **Polar only.** Stripe is not used; any earlier Stripe checkout code/docs were removed.

Current checkout provider path:

- Credit checkout route: `app/api/credits/checkout/route.ts`
- Product ids are read from environment variables:
  - `POLAR_STARTER_PRODUCT_ID`
  - `POLAR_CREATOR_PRODUCT_ID`
  - `POLAR_VIRAL_PACK_PRODUCT_ID`
- Checkout metadata includes app name, user id, plan id, and credit amount.

Credit reservation:

- `POST /api/music/generate` calls the backend RPC `create_music_with_credit`.
- If the user lacks credits, the route returns `402` with `error: "insufficient_credit"` and `remaining_credit`.
- The client maps this to `Not enough credits. Please upgrade.` and opens the existing Upgrade modal.
- If Replicate generation creation fails after credit reservation, `refund_failed_music_credit` is called.
- If polling later detects a failed/canceled/empty-output prediction, `refund_failed_music_credit` is also called.

## Free vs Paid Boundary

Current app behavior is credit-based rather than subscription-based.

- Authenticated users need credits to generate music.
- Credits are purchased as song packs.
- There is no current subscription entitlement system in the source-of-truth code.
- The pricing UI presents buyable song credits.

## Music Generation Policy

Model:

- `minimax/music-2.6` on Replicate

Flow:

1. User submits prompt/options.
2. Server translates free-text prompt to English when needed.
3. Server compiles a MiniMax prompt with `compileMusicPrompt`.
4. Backend reserves one credit and creates a `musics` row.
5. Replicate prediction starts.
6. Client polls `GET /api/music/[id]`.
7. On success, the mp3 is copied into InsForge Storage bucket `musics`.
8. The row is finalized with `audio_url` and `audio_key`.

Storage policy:

- Persist both `url` and `key` for generated audio.
- Audio upload key shape: `<userId>/<musicId>.mp3`.

Metadata policy:

- `musics.prompt` stores the raw user prompt.
- `metadata.final_music_prompt` stores the compiled prompt.
- `metadata.raw_user_description` stores the compiled input description.
- `metadata.prompt_version` stores the compiler version.
- `metadata.genre`, `metadata.moods`, `metadata.use_case`, `metadata.vocal_mode`, and `metadata.language` store normalized compiler options when present.
- `metadata.lyrics` stores user-submitted lyrics when present.
- `metadata.lyrics_payload` stores normalized lyrics when present.
- `metadata.prediction_id` stores the Replicate prediction id.

## Thumbnail Generation Policy

Model:

- `black-forest-labs/flux-schnell`

Output:

- Square `1:1` webp image

Prompt construction:

- `buildThumbnailPrompt` uses:
  - song title
  - `metadata.genre`
  - raw user prompt as mood/concept
  - lyrics theme when lyrics exist
  - fallback `abstract musical emotion`
- Prompt always asks for:
  - album cover art for an AI-generated song
  - bold, eye-catching, modern music cover art
  - square album cover
  - no text, no logo, no watermark

Flow:

- After music generation succeeds, the route sets `thumbnail_status: "pending"`.
- Thumbnail generation runs through `generateAndPersistThumbnail`.
- Successful thumbnail is uploaded to InsForge Storage with a key shaped like `<userId>/<musicId>-thumbnail-<timestamp>.webp`.
- The row stores `thumbnail_url`, `thumbnail_key`, `thumbnail_prompt`, and `thumbnail_status: "succeeded"`.
- On thumbnail failure, music remains completed but thumbnail fields are set to failed/null. Thumbnail failure does not fail the song.

## UX Principles

- The app should feel simple for normal users.
- Prompt engineering should remain internal.
- Raw machine error codes should not be shown to users.
- Example: `insufficient_credit` is mapped to `Not enough credits. Please upgrade.`
- Reuse existing billing UI instead of introducing duplicate payment surfaces.
- Keep generation controls lightweight: prompt, optional lyrics, and structured options.
- Avoid adding an advanced prompt editor unless there is a clear product need.

## Legal / Safety Principles

- Do not hardcode or expose API keys.
- Do not commit secrets.
- App code reads keys from `.env.local`.
- InsForge CLI reads `.insforge/project.json`.
- Artist/song references should be sanitized to generic descriptors.
- Final prompts always include a copyright-safe line telling the model not to imitate a specific artist, song, melody, or copyrighted track.

