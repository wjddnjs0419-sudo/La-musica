Redesign only Step 2 — Sound inside the existing 3-step “Create song” modal.

Do NOT change the overall Create Song modal structure.

Keep:
1. Lyrics
2. Sound
3. Create

Step 2 should preserve all existing La Musica sound-generation functionality while making the options easier to understand and visually cleaner.

IMPORTANT:
Do not replace the existing controls with a single Sound Direction textarea.
The structured settings are the primary source of truth.

-----------------------------------
STEP 2 HEADER
-----------------------------------

Title:
Shape your sound

Supporting copy:
Choose the sound, mood, and voice for your track.

Keep the page visually calm and easy to scan.

-----------------------------------
1. GENRE
-----------------------------------

Show Genre as a primary setting.

Only ONE genre can be selected at a time.

Display commonly used genres as selectable chips.

Example visual structure:

Genre

[ Pop ]
[ Hip-hop ]
[ Electronic ]
[ Rock ]
[ R&B ]
[ Indie ]
[ + More ]

Use the existing genre options from the current product.
Do not invent new backend options.

“+ More” can reveal the remaining existing genres.

Selected genre should have a clear active state.

-----------------------------------
2. MOOD
-----------------------------------

Show:

Mood                         Choose up to 3

Mood supports multi-select with a maximum of 3 selections.

Use the existing mood values from the product.

Examples currently include:
- Hard
- Energetic
- Dark
- Happy
- Emotional
- Sexy
- Epic
- Funny
- Nostalgic
- Romantic
- Aggressive
- Festival

Display them as compact selectable chips.

Once 3 moods are selected:
- keep the selected moods active
- prevent additional selection
- do not silently remove a previous mood

The “Choose up to 3” label should make the limit understandable.

-----------------------------------
3. VOCAL
-----------------------------------

Show Vocal as a segmented selection.

Existing options:

[ Auto ]
[ Male ]
[ Female ]
[ Instrumental ]

Only one can be active.

If Instrumental is selected and Step 1 already contains lyrics:

Do NOT delete the lyrics.

Show a small informational message:

“Lyrics won't be used for this generation.”

Lyrics should remain preserved in the creation state so the user can switch back to a vocal option later.

-----------------------------------
4. DURATION
-----------------------------------

Show:

Duration

[ Short · 1 min ]
[ Full · 3 min ]

Default selection:
Full · 3 min

Both duration options currently use the same credit cost.
Do not imply that Short is cheaper.

-----------------------------------
5. OPTIONAL SOUND DIRECTION
-----------------------------------

Below the primary structured options, provide a secondary free-text input.

Label:

Anything else about the sound?

Add a small label:
Optional

Placeholder:

e.g. warm piano, soft drums, late-night atmosphere

Purpose:
Allow users to describe instruments, tempo, atmosphere, or additional musical direction.

IMPORTANT:
This field is supplementary.

If the free-text direction conflicts with structured settings such as Genre or Vocal, the structured settings should remain the source of truth.

Visually give this field lower hierarchy than Genre, Mood, Vocal, and Duration.

-----------------------------------
6. ADVANCED SETTINGS
-----------------------------------

Add a collapsed section:

Advanced settings ▾

When expanded, show the existing secondary options:

- Language
- Use case
- Quick presets

Do not modify their current backend behavior.

-----------------------------------
LANGUAGE
-----------------------------------

Language is connected with the language used in Step 1.

If the user generated lyrics with AI using a selected language:
pre-fill the same language here.

If possible, when users write their own lyrics, the existing product may detect or infer the language and show it here.

The user may change the Song language in Step 2.

Changing Song language must NOT automatically translate existing lyrics.

If the selected song language differs from the lyrics language, show a subtle informational warning instead of changing the lyrics.

Do not add automatic translation functionality.

-----------------------------------
USE CASE
-----------------------------------

Keep the current existing Use case options and behavior.

Place this inside Advanced because it is secondary to the core sound direction.

-----------------------------------
QUICK PRESETS
-----------------------------------

Keep the existing presets and their current functional behavior exactly as implemented.

Current examples include:
- Football Chant
- Meme
- Sports Hype

Do not redesign the preset logic.

Only redesign their UI as compact preset chips inside Advanced settings.

-----------------------------------
BOTTOM NAVIGATION
-----------------------------------

Bottom left:
Back

Bottom right:
Continue

Continue moves to Step 3 — Create.

-----------------------------------
VISUAL STYLE
-----------------------------------

Match the current La Musica redesign:

- near-black background
- dark elevated surfaces
- warm white primary text
- muted gray secondary text
- subtle white-alpha borders
- white primary CTA with black text
- restrained rounded corners
- minimal editorial music-product aesthetic

Avoid:
- bright blue SaaS UI
- AI sparkle graphics
- large gray option panels
- dropdown-heavy admin forms
- excessive cards
- gradients
- glassmorphism

The page should feel like choosing the creative direction of a song, not configuring software settings.