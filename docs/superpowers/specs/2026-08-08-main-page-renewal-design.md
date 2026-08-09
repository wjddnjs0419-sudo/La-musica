# La Musica Main Page Renewal Design

## Goal

Replace the current generic AI landing page with a dark, editorial music-brand homepage while retaining the existing sample playback, credit checkout, authentication, and workspace routes.

## Approved decisions

- The visual foundation is dark: `#050505` page background, restrained elevated surfaces, and artwork-led colour accents.
- The supplied wireframe defines section order and information hierarchy; it is not a light-theme implementation reference.
- Desktop and mobile are intentionally composed. Mobile is not a scaled 1200px layout.
- Featured tracks use the existing four pinned sample records and their existing artwork/audio URLs.
- Product demonstrations show only current controls: prompt/lyrics, genre, moods, vocal mode, use case, language, and 1- or 3-minute duration. Tempo, BPM, style-influence, regeneration, and format-tier claims are excluded.
- Prices, song counts, checkout, and plan selection remain sourced from `CREDIT_PLANS` and the existing checkout route.
- Logged-out entry remains `/auth`; authenticated entry remains `/workspace`. No login modal or `/create` route is introduced.
- Footer uses existing routes first: Home, Workspace/Create, Pricing, Contact, Privacy, and Terms. Unsupported footer destinations are omitted.

## Experience structure

1. **Sticky header** — logo, Pricing anchor, Sign in, and Create. On mobile, preserve Create within the menu/compact header. Both auth-aware CTAs retain current destination logic.
2. **Hero** — approved headline, supporting copy, CTA, and a dark product-flow composition: lyrics → creating → finished track/player. A recording-studio image anchors the left side of the section, while the three-stage flow is interactive presentation content only: it never invokes music generation.
3. **Featured Creations** — four existing samples in a responsive card layout. Artwork is dominant; title, prompt-derived description, duration, and explicit play/pause are secondary. A single audio element ensures one active track.
4. **How It Works** — the three approved steps, with concise copy and no technical-model explanation.
5. **Product proof** — two static frames. The first communicates input-to-track output; the second mirrors supported generation controls only.
6. **Pricing** — existing checkout behavior with a dark editorial card treatment and pay-as-you-go explanation.
7. **Final CTA and footer** — reuse the auth-aware CTA; retain only valid navigational destinations and the oversized `LA MUSICA` closer.

## Responsive rules

| Area | Desktop (>=1024px) | Mobile (<1024px) |
|---|---|---|
| Hero | recording-studio backdrop, copy, and visual flow compose in two columns | copy then vertical three-step flow; the backdrop is cropped above the content |
| Samples | four-card grid | horizontal snap rail with one substantial card visible |
| How it works | three columns with dividers | vertical numbered list |
| Product proof | asymmetric text/frame pairs, alternating sides | copy followed by its frame |
| Pricing | three cards | single-column stack |
| Footer | brand plus product/legal link groups | stacked groups; fluid oversized type with clipped container |

## Accessibility and motion

- Buttons and playback controls have visible focus states and descriptive accessible labels.
- Play/pause state has an icon and text/ARIA state; no autoplay.
- The Hero flow types fixed lyric copy, advances through a short generation progress state, then exposes a playable finished-track card. Visitors can choose any stage by hover, keyboard focus, or click; the flow restarts from the selected stage where applicable.
- The finished-track card uses one fixed demo audio URL, reflects loaded duration and playback progress, and never autoplays audio.
- Motion is limited to Hero typing/progress feedback, hover/press feedback, artwork scale/glow, and short state transitions; it is disabled or reduced under `prefers-reduced-motion`.
- Interactive elements meet a 44px minimum mobile target where practical.

## Non-goals

- No backend, database, music-generation, payment, or authentication refactor.
- No new public routes, social links, pricing benefits, or made-up artist metadata.
- No WebGL, liquid-metal shader, rainbow gradients, or continuous decorative animation on the homepage.
