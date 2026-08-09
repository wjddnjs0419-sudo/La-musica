# La Musica — Design System

> Version: Main Page Renewal  
> Design direction: Apple Music × Editorial Music Brand  
> Core rule: **Music-first, AI-second.**

---

# 1. Design Principles

## 1.1 Music is the color

The base interface is neutral and dark.

Do not rely on a fixed purple/cyan AI gradient as the main identity.

Album artwork should introduce most of the page's expressive color through controlled glow, blur, and contextual accents.

---

## 1.2 Editorial, not dashboard

The page should feel closer to:

- a premium music platform
- an album campaign
- an editorial culture brand

than to:

- an admin dashboard
- a B2B SaaS page
- an AI startup template

---

## 1.3 Product proof over abstract decoration

Use real-product-inspired UI and actual music artwork.

Avoid generic 3D objects that do not explain the service.

---

## 1.4 Quiet interface, expressive content

UI chrome should stay restrained.

Music artwork, headlines, and product moments carry the emotion.

---

# 2. Color System

The exact brand accent is intentionally not a fixed neon color.

## Core tokens

```css
:root {
  --color-bg: #050505;
  --color-bg-elevated: #0B0B0C;
  --color-surface: #111113;
  --color-surface-hover: #17171A;

  --color-text-primary: #F5F5F3;
  --color-text-secondary: #A6A6A2;
  --color-text-tertiary: #72726E;

  --color-border: rgba(255, 255, 255, 0.10);
  --color-border-strong: rgba(255, 255, 255, 0.18);

  --color-overlay-soft: rgba(255, 255, 255, 0.05);
  --color-overlay-strong: rgba(0, 0, 0, 0.56);

  --color-focus: #F5F5F3;
}
```

---

## 2.1 Background usage

### Page background

`#050505`

Use as the dominant page background.

### Elevated surfaces

`#0B0B0C`

Use for:

- modal
- product UI frames
- pricing cards
- floating player surfaces

### Interactive surface

`#111113`

Use sparingly for:

- control containers
- input backgrounds
- secondary cards

---

## 2.2 Text

### Primary

`#F5F5F3`

Use for:

- headlines
- important labels
- pricing
- primary CTA text on dark surfaces

### Secondary

`#A6A6A2`

Use for:

- body copy
- helper text
- metadata

### Tertiary

`#72726E`

Use for:

- less important metadata
- timestamps
- inactive labels

---

# 3. Artwork-driven Accent System

Do not define one permanent neon accent for the whole page.

Instead, each featured song may contribute a contextual glow.

### Example implementation

```css
.track-artwork {
  --art-accent: 180 90 255;
}

.track-glow {
  background: radial-gradient(
    circle,
    rgb(var(--art-accent) / 0.22),
    transparent 68%
  );
  filter: blur(48px);
}
```

### Rules

- Glow opacity should remain low.
- Glow must not reduce text readability.
- Do not place multiple saturated glows directly on top of each other.
- The page should still look polished with all glows removed.

This prevents the accent system from becoming another AI-gradient motif.

---

# 4. Typography

## Recommended pairing

### Sans

**Inter**

Use for:

- navigation
- body
- buttons
- labels
- metadata
- pricing
- product UI

Fallback:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Editorial Serif

**Instrument Serif**

Use selectively for:

- italic/emphasized words in hero
- large editorial statements
- selected visual moments

Fallback:

```css
font-family: "Instrument Serif", Georgia, "Times New Roman", serif;
```

> ASSUMPTION: Inter + Instrument Serif is the implementation default because an exact font family was not separately locked during planning. If the current project already includes equivalent premium fonts, they may be substituted without changing the typography roles below.

---

# 5. Type Scale

## Desktop

```css
--text-display-xl: clamp(4.5rem, 7vw, 7.5rem);
--text-display-lg: clamp(3.5rem, 5vw, 5.5rem);
--text-h1: clamp(3rem, 4vw, 4.75rem);
--text-h2: clamp(2.25rem, 3vw, 3.5rem);
--text-h3: 2rem;

--text-body-lg: 1.125rem;
--text-body: 1rem;
--text-small: 0.875rem;
--text-caption: 0.75rem;
```

## Mobile

Use responsive clamp values rather than separate rigid pixel values.

Hero headline should remain large and expressive, but never force awkward single-character wrapping.

---

# 6. Typography Roles

## Hero headline

- Sans as main face
- Serif italic only for deliberate emphasis
- Tight tracking
- Controlled line height

Example direction:

**Who says you can't  
make *music*?**

Do not italicize or serif multiple random words.

---

## Section headlines

- Mostly sans
- Bold / semibold
- Short and direct

Examples:

- Turn words into music.
- Make it sound like you.
- Your song is waiting.

---

## Body

- Regular sans
- 16–18px desktop
- High readability
- Avoid long paragraph widths

Recommended max width:

`54–64ch`

---

# 7. Spacing System

Use an 8px-based system.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
--space-10: 128px;
--space-11: 160px;
```

### Section spacing

Desktop:

- standard section vertical padding: `96–128px`
- hero may use more breathing room

Mobile:

- standard section vertical padding: `64–80px`

Avoid packing sections tightly.

Whitespace is a primary part of the premium look.

---

# 8. Layout

## Main container

```css
max-width: 1440px;
margin-inline: auto;
padding-inline: clamp(20px, 4vw, 64px);
```

## Content max width

For editorial text:

`680–760px`

For product demos:

Use larger width and allow asymmetric composition.

---

# 9. Border Radius

Avoid overly soft “AI SaaS” cards.

Recommended:

```css
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 24px;
--radius-pill: 999px;
```

### Usage

- buttons: pill or 12–16px depending on component
- album artwork: 12–16px
- product frame: 20–24px
- pricing card: 20–24px
- modal: 24px

Avoid using large 32–48px radius on every component.

---

# 10. Borders

Use subtle white-alpha borders.

Default:

```css
border: 1px solid rgba(255,255,255,0.10);
```

Hover / highlighted:

```css
border-color: rgba(255,255,255,0.18);
```

Avoid bright blue or purple outline borders as a general UI motif.

---

# 11. Buttons

## Primary CTA

Direction:

- light button on dark background
- strong contrast
- no neon gradient
- clean, premium

Example:

```css
.button-primary {
  background: #F5F5F3;
  color: #080808;
  border-radius: 999px;
  min-height: 48px;
  padding-inline: 24px;
  font-weight: 600;
}
```

### Hover

- slight opacity/value change
- subtle scale max `1.01–1.02`
- fast transition

Do not bounce.

---

## Secondary button

```css
.button-secondary {
  background: rgba(255,255,255,0.06);
  color: #F5F5F3;
  border: 1px solid rgba(255,255,255,0.12);
}
```

---

# 12. Header

## Style

- sticky
- minimal
- quiet
- dark / translucent
- thin lower border only if needed

Suggested state:

```css
background: rgba(5,5,5,0.72);
backdrop-filter: blur(18px);
border-bottom: 1px solid rgba(255,255,255,0.06);
```

### Height

Approximately `68–76px`.

### Navigation

Keep short.

- Logo
- Pricing
- Sign in
- Create

---

# 13. Hero

## Layout

Desktop:

Two major zones:

1. Copy / CTA
2. Product transformation composition

The transformation should visually communicate:

**Lyrics → AI → Song**

### Product composition rules

- Derived from real product UI
- Simplified for storytelling
- No fake advanced capabilities
- Avoid random floating cards
- Cards can overlap only when the hierarchy remains obvious
- Finished track should be visually dominant

### Mobile

Convert to vertical sequence.

---

# 14. Album Artwork

## Rules

- Reuse existing 4 images unchanged today.
- Keep artwork visually dominant.
- Avoid excessive overlays directly on the image.
- Do not force all images into one fake color grade.
- Use surrounding UI and spacing to create cohesion.

### Card ratio

Prefer existing source ratio if consistent.

If a unified card is required:

`1:1` artwork crop is the default music-platform convention, but do not destructively edit the source file.

Use CSS `object-fit: cover`.

---

# 15. Featured Track Card

## Structure

1. Artwork
2. Play control
3. Track name
4. Artist
5. Genre / duration metadata

### Priority

Artwork > title > artist > metadata

### Play button

- Must be explicit
- Card itself does not automatically trigger playback
- Play button becomes pause while active

### Hover

Desktop only:

- artwork scale max ~1.02
- slight surface lift
- subtle accent glow increase

No dramatic 3D tilt.

---

# 16. Product UI Frames

## Frame style

- Dark elevated surface
- Subtle border
- Clear hierarchy
- No over-decoration

Suggested:

```css
background: #0B0B0C;
border: 1px solid rgba(255,255,255,0.10);
box-shadow:
  0 24px 80px rgba(0,0,0,0.35),
  inset 0 1px 0 rgba(255,255,255,0.03);
```

Use shadow sparingly.

---

# 17. Pricing Cards

## Visual hierarchy

1. Plan name
2. Price
3. Song count
4. Supporting copy
5. CTA

### Recommended treatment

- 3 cards
- one plan may be highlighted if the current business logic already treats it as recommended
- highlight through slight surface/border contrast, not neon gradient

### Pay-as-you-go messaging

Must remain visible.

Avoid visual patterns that imply monthly billing if it is not monthly.

---

# 18. Modal

## Google Login Modal

### Style

- centered
- elevated black surface
- minimal
- close control
- clear Google sign-in button
- no unrelated onboarding fields

Suggested max width:

`420–480px`

### Backdrop

```css
background: rgba(0,0,0,0.70);
backdrop-filter: blur(8px);
```

---

# 19. Footer

## Structure

Upper:

- Brand line
- Product
- Legal
- Social

Lower:

Large **LA MUSICA** typography.

### Brand line

**Your ideas deserve a soundtrack.**

### Large type rules

- Very large
- Cropping is allowed if intentional
- Low enough contrast not to overpower links
- No horizontal overflow on mobile
- Should feel editorial, not like a watermark

---

# 20. Motion System

## Duration

```css
--motion-fast: 160ms;
--motion-base: 240ms;
--motion-slow: 420ms;
```

## Easing

```css
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
```

### Allowed motion

- button state
- track hover
- play/pause feedback
- hero UI entrance
- soft glow transition
- subtle section reveal

### Avoid

- infinite decorative loops
- constant floating
- spinning gradients
- 3D blobs
- large parallax
- elastic bounce
- strong scroll-jacking

---

# 21. Iconography

Use one consistent outline icon system already available in the project.

Recommended character:

- simple
- geometric
- 1.5–2px stroke
- rounded only where natural

Important icons:

- Play
- Pause
- Arrow
- Close
- Google brand mark where required

Do not mix multiple icon families.

---

# 22. Imagery

Primary imagery:

**Album artwork**

Secondary imagery:

**Product UI**

Avoid:

- generic stock musicians
- AI-generated chrome blobs
- futuristic glass spheres
- random abstract 3D tunnels
- unnecessary human lifestyle photography

The main page should communicate music creation through the actual product and its output.

---

# 23. Accessibility

Minimum requirements:

- Body text should maintain strong contrast.
- Buttons must have visible focus states.
- Playback controls need accessible labels.
- Do not rely on color alone for active playback state.
- Respect `prefers-reduced-motion`.
- Minimum interactive target approximately 44px on mobile.
- Modal should support escape/close behavior and focus management if current stack allows.

---

# 24. Responsive Rules

## Desktop reference

1440px

## Mobile reference

390px

### Mobile adjustments

- Hero transformation becomes vertical.
- Track grid can stack or become controlled horizontal scroll.
- Pricing cards stack.
- Navigation simplifies without losing Create CTA.
- Large footer type scales fluidly.
- Product feature compositions become single-column.
- Decorative glows reduce in intensity.

---

# 25. Do / Don’t

## DO

- Use black as the visual foundation.
- Let album artwork introduce color.
- Use large editorial typography.
- Show real product behavior.
- Keep copy short.
- Use generous whitespace.
- Keep animations quiet.
- Make music output visible near the top.

## DON'T

- Recreate the current rainbow/3D hero.
- Use purple gradient borders everywhere.
- Add generic AI sparkles.
- Fill the page with feature-icon cards.
- Use glassmorphism on every component.
- Add unsupported product features.
- Hide the music behind long explanatory copy.
- Make every element rounded and floating.

---

# 26. Quick Implementation Tokens

```css
:root {
  --bg: #050505;
  --bg-elevated: #0B0B0C;
  --surface: #111113;
  --surface-hover: #17171A;

  --text-1: #F5F5F3;
  --text-2: #A6A6A2;
  --text-3: #72726E;

  --border: rgba(255,255,255,0.10);
  --border-strong: rgba(255,255,255,0.18);

  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  --motion-fast: 160ms;
  --motion-base: 240ms;
  --motion-slow: 420ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);

  --container: 1440px;
}
```

---

# 27. Final Visual Test

Before shipping, ask:

1. If all AI-related words disappeared, would this still look like a music brand?
2. Can a visitor understand “lyrics become a song” from the hero alone?
3. Are the album covers the most expressive color on the page?
4. Is any visual element present only because “AI websites usually have it”?
5. Does the mobile version preserve the same story rather than merely shrink the desktop layout?

If the answer to #4 is yes, remove that element.
