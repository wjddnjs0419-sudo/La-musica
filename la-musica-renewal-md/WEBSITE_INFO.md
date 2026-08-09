# La Musica — Website Information

> Use this document as the product/brand context source for landing-page design, Stitch prompts, copy decisions, and Codex implementation.

---

## 1. Service Name

**La Musica**

---

## 2. What La Musica Is

La Musica is an AI music creation service that allows users to turn lyrics or an idea into a complete song.

The service is for people who want to make music but do not necessarily know how to compose, produce, arrange, or perform a song themselves.

La Musica should be perceived as an accessible **AI Music Studio**, not merely as an AI generation tool.

---

## 3. Core Product Promise

**Anyone can start making music today.**

The product lowers the barrier between:

**“I have lyrics / an idea”**

and

**“I have a complete song I can listen to.”**

---

## 4. Positioning

### Category

AI Music Creation / AI Music Studio

### Positioning statement

**An AI Music Studio that lets anyone turn their lyrics and ideas into a complete song.**

### Main distinction in communication

The website should lead with the emotional and creative outcome — making your own music — rather than with AI technology.

### We are

- Creative
- Accessible
- Music-first
- Premium
- Expressive
- Modern
- Simple

### We are not

- A technical AI dashboard
- A developer tool
- A crypto / Web3-style product
- A futuristic 3D demo
- A generic purple-gradient AI startup
- A complicated professional DAW

---

## 5. Target Audience

### Primary audience 01

People who want to make music but have no music-production knowledge.

Examples:

- Someone with a lyric idea
- Someone who has always wanted to make a song
- Someone who does not know how to compose or produce

### Primary audience 02

People who write lyrics but cannot turn them into a finished song.

### Secondary audience

Creators who may need original music for:

- social media
- personal content
- creative experiments
- short-form video
- personal projects

---

## 6. User Need

The user should be able to think:

> “I don't know how to produce music, but I can still make a real song here.”

---

## 7. Main Website Goal

The main page has two jobs:

1. Explain exactly what La Musica does.
2. Convince the visitor to create their first song.

Everything else is secondary.

---

## 8. Hero Copy

### Headline

**Who says you can't make music?**

### Subheadline

**Turn your lyrics into a complete song with AI.**

### Primary CTA

**Create your first song**

### CTA support copy

**First song free · No subscription**

---

## 9. Core Website Narrative

The main page should tell the following story:

### Step 1 — Possibility

“You can make music.”

### Step 2 — Proof

“Here are songs made with La Musica.”

### Step 3 — Simplicity

“It only takes a few steps.”

### Step 4 — Product credibility

“Here is how the real product works.”

### Step 5 — Purchase clarity

“You can buy only the credits you need.”

### Step 6 — Conversion

“Your song is waiting.”

---

## 10. Main Page Structure

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

## 11. Featured Creations

### Purpose

Show actual output before explaining too much.

### Track presentation

Each item should feel like a released song, not an AI prompt example.

Show:

- artwork
- track title
- artist
- genre
- duration
- play button

### Interaction

Audio plays only when the play button is pressed.

No autoplay.

Only one track should play at a time.

---

## 12. How It Works

### 01 — Write your lyrics

Bring your words or idea.

### 02 — Shape your sound

Choose from the sound controls actually supported by the current product.

### 03 — Get your song

Receive a complete generated track.

---

## 13. Product Feature Messaging

### Feature 01

**Turn words into music.**

Use real-product-inspired UI to show the transformation from lyrics to a finished track.

### Feature 02

**Make it sound like you.**

Show the current personalization controls available in the generation experience.

Do not claim unsupported functionality.

---

## 14. Pricing

La Musica currently uses a **pay-as-you-go** model.

It is not positioned as a recurring subscription.

### Current visible plans

#### Starter

**$2.99**

5 songs

#### Creator

**$7.99**

20 songs

#### Viral Pack

**$14.99**

50 songs

### Pricing communication priorities

1. Easy to understand
2. Pay only when needed
3. No subscription pressure
4. First song free

Package names/supporting copy may be visually or verbally refined, but underlying pricing logic remains unchanged.

---

## 15. Final CTA

### Headline

**Your song is waiting.**

### Supporting copy

**All you need is an idea.**

### Button

**Create your first song**

---

## 16. Footer

### Brand line

**Your ideas deserve a soundtrack.**

### Footer information groups

- Brand
- Product
- Legal
- Social

### Signature visual

A large **LA MUSICA** typographic lockup closes the page.

---

## 17. Authentication

### Provider

Google only.

### Logged-out CTA flow

Create CTA
→ Google login modal
→ successful login
→ `/create`

### Logged-in CTA flow

Create CTA
→ `/create`

The redesign should reuse the current Google auth implementation.

---

## 18. Product Logic to Preserve

Do not redesign or replace the following as part of the main-page project:

- Google auth logic
- music generation logic
- AI/music API integration
- database
- payments
- current pricing logic
- current audio files
- existing routing
- `/create` product flow
- deployment architecture

---

## 19. Existing Assets

For today's redesign:

- Reuse the 4 current album artworks.
- Reuse current audio files.
- Do not edit the album-art image files.
- The page may use UI framing, layout, spacing, and glow to make them coexist with the new design system.

---

## 20. Brand Voice

### Tone

- Confident
- Creative
- Encouraging
- Simple
- Human
- Slightly provocative
- Never overly technical

### Good examples

**Who says you can't make music?**

**Turn words into music.**

**Make it sound like you.**

**Your song is waiting.**

**Your ideas deserve a soundtrack.**

### Avoid

- “Unleash the power of AI”
- “Revolutionary AI-powered music generation”
- “Next-generation creative ecosystem”
- “Limitless innovation”
- Excessive AI buzzwords
- Long explanations of the model or generation pipeline

---

## 21. Visual Positioning

Reference mood:

**Apple Music × Editorial Music Brand**

The design should look like a music product first.

The AI nature of the service is explained through product flow, not through futuristic decoration.

---

## 22. Language

### Current

English-first.

### Future

The architecture should not make future localization unnecessarily difficult.

Multilingual UI is not part of today's redesign.

---

## 23. Main UX Principle

**Show the transformation, then explain it.**

Do not make visitors read several sections before understanding what La Musica produces.

---

## 24. Conversion Principle

Every major CTA labeled **Create your first song** should lead into the same intentional flow:

- Logged out: Google login modal
- Logged in: `/create`

Keep this behavior consistent throughout the page.
