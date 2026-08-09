# La Musica Main Page Renewal PRD

> Project: La Musica  
> Type: Existing service main-page redesign  
> Goal: Replace the current “AI slop / generic AI SaaS” impression with a premium music-brand experience while preserving all existing business logic.  
> Target work time: 1–2 hours  
> Priority: Portfolio quality > UX clarity > commercial polish

---

## 1. Background

La Musica is an AI music creation service that turns a user's lyrics or idea into a complete song.

The current service already has working product logic, authentication, pricing, payment, music generation, audio assets, and routing. The main problem is not the core functionality but the presentation layer.

### Current problems

1. The main page looks like a generic AI-generated SaaS landing page.
2. The hero does not clearly communicate what the service does.
3. Abstract 3D graphics create an “AI slop” impression.
4. Purple / cyan / rainbow lighting styles compete with one another and weaken brand consistency.
5. The product purpose — “turn your lyrics into a complete song” — is not visible quickly enough.
6. Existing sections are individually usable, but the narrative between them is weak.

---

## 2. Product Positioning

### One-line positioning

**An AI Music Studio that lets anyone turn their lyrics and ideas into a complete song.**

### Core user promise

Users do not need music-production knowledge to make a song.

### Hero message

**Who says you can't make music?**

*Turn your lyrics into a complete song with AI.*

### Brand attitude

- Music-first, not AI-first
- Premium, expressive, editorial
- Easy enough for a beginner
- Avoid technical AI jargon on the main page
- Avoid generic “future / innovation / AI gradient” visual language

---

## 3. Target Users

### Primary

1. People with no music-production experience
2. People who write lyrics but cannot compose or produce music

### Secondary

- Creators who need original music for personal or social content

---

## 4. Renewal Goals

### Primary goals

1. A first-time visitor should understand within 3 seconds that La Musica creates songs from lyrics.
2. Make the site feel like a premium music product rather than a generic AI tool.
3. Show real music output early on the page.
4. Drive users to create their first song.
5. Preserve every existing core business function.

### Success criteria for this redesign

- Hero clearly shows the input → creation → finished-song transformation.
- Main page has one coherent visual language.
- The Featured Creations section feels like a real music platform.
- CTA flow reaches the existing `/create` flow through Google login.
- Desktop and mobile layouts are both usable.
- No existing auth, generation, payment, database, or routing behavior is broken.

---

## 5. Scope

## IN SCOPE

- Main page redesign
- Header
- Hero
- Featured Creations
- How It Works
- Product Feature 01
- Product Feature 02
- Pricing
- Final CTA
- Footer
- Google login modal
- Desktop responsive layout
- Mobile responsive layout
- Light interaction / subtle motion

## OUT OF SCOPE

- `/create` redesign
- Music generation logic
- AI model changes
- Database changes
- Authentication implementation changes
- Payment provider or payment logic changes
- Routing architecture changes
- Backend refactor
- New pricing logic
- New album-art production
- Full tablet-specific mockup
- Heavy animation / WebGL / 3D effects
- Full multilingual implementation

---

## 6. Non-negotiable Existing Logic

The following must remain unchanged and should be reused as-is:

- Google authentication logic
- Existing `/create` route and generation flow
- Existing music-generation API integration
- Existing database
- Existing payment logic
- Existing pricing/business logic
- Existing audio files
- Existing routing structure
- Existing deployment structure

The redesign should replace the presentation layer, not the business layer.

---

## 7. Information Architecture

Final main-page order:

1. Header
2. Hero
3. Featured Creations
4. How It Works
5. Product Feature 01
6. Product Feature 02
7. Pricing
8. Final CTA
9. Footer

---

# 8. Section Requirements

## 8.1 Header

### Purpose

Provide only the navigation necessary to understand the product and start creating.

### Direction

- Minimal
- Sticky
- Dark / transparent or near-black background
- Visually quiet
- Do not make it feel like a corporate SaaS navigation bar

### Proposed navigation

- La Musica logo
- Pricing
- Sign in
- Create

### Interaction

- Sticky during scroll
- `Sign in` opens Google login modal
- `Create`:
  - logged out → Google login modal
  - logged in → `/create`

---

## 8.2 Hero

### Copy

**Who says you can't make music?**

*Turn your lyrics into a complete song with AI.*

Primary CTA:

**Create your first song**

Supporting microcopy:

**First song free · No subscription**

### Desktop visual concept

Show a clear left-to-right transformation:

**Lyrics input → AI creation state → Finished song**

The visual must be based on real La Musica product functionality, but may be compressed and rearranged for landing-page storytelling.

### Hero demo content

Use fixed demo content rather than real-time or random content.

Suggested demo structure:

- Lyrics preview
- Genre / mood selection
- “Creating your song…” state
- Finished album artwork
- Track title
- Compact music player

### Important

Do not use abstract 3D AI objects as the main hero asset.

### Mobile behavior

Convert the horizontal transformation into a vertical story:

**Lyrics**
↓
**Creating your song…**
↓
**Finished track + player**

Do not simply shrink the desktop composition.

---

## 8.3 Featured Creations

### Purpose

Prove the output quality immediately after the hero.

### Assets

Reuse the current 4 album artworks and existing audio files without editing the image files.

### Card information

Each track card should contain:

- Artwork
- Track title
- Artist name
- Genre
- Duration
- Play button

### Naming direction

Avoid AI-demo naming such as:

- “HipHop Style”
- “EDM Style”

Present tracks more like actual releases.

Example style:

- After Midnight — Juno
- Neon Hearts — Mika

Exact names may be mapped to existing assets during implementation.

### Audio interaction

- Music plays only when the user presses the play button.
- No autoplay.
- Only one track should play at a time.
- Active track button changes to pause.
- Stopping or switching tracks must be predictable.

---

## 8.4 How It Works

### Purpose

Explain the service in approximately 3 seconds.

### Structure

#### 01 — Write your lyrics

Start with your own words or an idea.

#### 02 — Shape your sound

Choose the mood, genre, style, or other available options.

#### 03 — Get your song

La Musica turns the input into a complete song.

### Direction

- Short
- Visual
- No long AI explanation
- No unnecessary technical terminology

---

## 8.5 Product Feature 01

### Headline

**Turn words into music.**

### Purpose

Show how lyrics become a finished song.

### Visual

Use a real-product-inspired UI composition.

Possible elements:

- Lyrics input
- generation status
- result track
- album art
- player

### Rule

The product UI itself should carry most of the explanation.

---

## 8.6 Product Feature 02

### Headline

**Make it sound like you.**

### Purpose

Show customization.

### Visual

Use existing available controls such as:

- Genre
- Mood
- Style
- Voice or other current generation options

Do not invent functionality that La Musica does not actually support.

---

## 8.7 Pricing

### Existing pricing structure

Keep the existing 3-tier, pay-as-you-go model.

Current visible plans:

- Starter — $2.99 / 5 songs
- Creator — $7.99 / 20 songs
- Viral Pack — $14.99 / 50 songs

### Rules

- Do not change pricing logic.
- Do not change payment logic.
- Package names and supporting copy may be refined.
- Clearly communicate that this is pay-as-you-go, not a subscription.
- Reconfirm the free-first-song benefit here.

### Desired visual tone

Less “SaaS pricing table,” more premium product purchase choice.

Still keep comparison easy to scan.

---

## 8.8 Final CTA

### Copy

**Your song is waiting.**

*All you need is an idea.*

Button:

**Create your first song**

### CTA behavior

- logged out → Google login modal
- logged in → `/create`

---

## 8.9 Footer

### Structure

- Brand
- Product
- Legal
- Social

### Brand copy

**Your ideas deserve a soundtrack.**

### Signature element

Retain the large **LA MUSICA** footer typography concept, but redesign it to be cleaner and more premium.

The large typography should act as the final visual closing element, not compete with the content above it.

---

# 9. Authentication Flow

## Logged-out user

CTA
→ Google login modal
→ successful login
→ `/create`

## Logged-in user

CTA
→ `/create`

### Authentication provider

Google only.

### Important

Reuse current auth logic. This PRD does not request authentication refactoring.

---

# 10. Responsive Requirements

## Desktop

Primary design width reference:

**1440px**

Requirements:

- Hero transformation reads horizontally.
- 4 featured tracks should fit elegantly without feeling cramped.
- Product feature sections can use large editorial compositions.

## Mobile

Primary design width reference:

**390px**

Requirements:

- Hero changes to vertical storytelling.
- Featured tracks may stack or use controlled horizontal scrolling.
- Primary CTA remains obvious.
- Pricing cards must remain readable.
- Large footer typography must not create horizontal overflow.
- Touch targets should be comfortable.

Tablet receives fluid responsive behavior but does not need a dedicated mockup in today's scope.

---

# 11. Motion Requirements

Use motion only when it supports hierarchy or feedback.

Allowed:

- Button hover / press feedback
- Album-card hover
- Play / pause state animation
- Hero product UI subtle entrance
- Very subtle album-art glow
- Soft section reveal if implementation time allows

Avoid:

- 3D floating AI objects
- Heavy parallax
- WebGL
- Excessive gradients
- Continuous distracting motion
- Large bouncing / scaling effects

---

# 12. Implementation Strategy

Because the existing main page visually needs a major reset:

### Recommended approach

Rebuild the main-page UI components rather than forcing the new design into the old visual structure.

### Reuse

Reuse existing:

- auth handlers
- route handlers
- generation logic
- pricing data
- audio data
- payment functions
- current asset files

### Do not touch

Business logic.

---

# 13. Today’s 1–2 Hour Execution Order

To prevent scope creep:

### Phase 1 — Core shell

1. Global visual tokens
2. Header
3. Hero
4. Main responsive container

### Phase 2 — Proof and conversion

5. Featured Creations
6. Pricing
7. Final CTA

### Phase 3 — Story

8. How It Works
9. Product Feature 01
10. Product Feature 02
11. Footer

### Phase 4 — Interaction / QA

12. Login modal connection
13. Audio play behavior
14. Mobile QA
15. Minimal motion
16. Final visual cleanup

If time runs short, prioritize:

**Hero → Featured Creations → Pricing → Final CTA → Mobile stability**

before polishing secondary motion.

---

# 14. Definition of Done

The redesign is complete when:

- [ ] Hero immediately communicates lyrics → song generation.
- [ ] Current 3D AI-slop hero visual is removed.
- [ ] Main page uses the new visual system consistently.
- [ ] Existing 4 tracks are displayed.
- [ ] Play button plays the selected track.
- [ ] Only one track plays at a time.
- [ ] Header remains sticky.
- [ ] CTA opens Google login modal for logged-out users.
- [ ] Logged-in CTA routes to `/create`.
- [ ] Pricing data remains connected to current business logic.
- [ ] Final CTA is implemented.
- [ ] Footer contains the new brand message.
- [ ] Large LA MUSICA footer typography is retained in redesigned form.
- [ ] Desktop at ~1440px is visually complete.
- [ ] Mobile at ~390px is usable and intentionally composed.
- [ ] No existing auth, payment, generation, database, or routing behavior is broken.

---

# 15. Assumptions

These are working assumptions and should not silently become new product logic.

1. Existing plan prices and song quantities are still the current source of truth.
2. Existing album art and audio files are available to the main page.
3. Existing Google auth can be called from a new modal UI.
4. Existing auth state can determine whether CTA opens login or routes directly to `/create`.
5. Existing generation options shown in product mockups must reflect actual implemented options.
6. SEO / analytics configuration remains unchanged.
7. The site remains English-first for this redesign.
8. Future i18n should not be blocked, but multilingual UI is not implemented today.
9. Desktop and mobile are the only intentionally designed breakpoints today.

---

# 16. Open Risks

1. **Time constraint**  
   1–2 hours is aggressive. Complex motion or excessive component refinement can prevent full-page completion.

2. **Existing artwork fit**  
   Current album covers may visually conflict with the new premium direction. They remain unchanged for today's version.

3. **Logo redesign**  
   The logo is a redesign target, but deep logo exploration should not delay the main-page build.

4. **Hero product composition**  
   If it becomes too conceptual and stops resembling the real product, the redesign may become another form of “AI slop.” Keep it grounded in actual UI.

5. **Pricing source of truth**  
   Implementation should read existing pricing configuration instead of duplicating values if the current code already centralizes them.
