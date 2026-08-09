Redesign the existing La Musica full-screen music player.

IMPORTANT:
Preserve all existing music playback functionality.

Do NOT add:
- timestamped lyrics
- karaoke highlighting
- waveform generation
- shuffle
- repeat
- new audio features

This is primarily a visual and layout redesign.

The player should feel like the immersive listening extension of the redesigned La Musica Workspace.

Visual direction:
Apple Music-inspired immersion × La Musica editorial music brand.

==================================================
DESKTOP LAYOUT
==================================================

Use a two-column layout.

LEFT:
- Large album artwork
- Track information underneath or closely connected to the artwork

RIGHT:
- Lyrics
- Scrollable if necessary

The layout should feel balanced and spacious.

Do not center everything vertically like the current player.

Recommended album artwork size:
approximately 420–500px on a 1440px desktop viewport.

The artwork should be one of the strongest visual elements on the screen.

==================================================
AMBIENT BACKGROUND
==================================================

Use the CURRENT TRACK'S album artwork to create the full-screen ambient background.

Do not use a fixed brand gradient.

Create a large blurred version of the artwork behind the player UI.

Suggested treatment:

- cover the entire viewport
- heavy blur approximately 70–100px
- scale slightly larger than the viewport to avoid visible blur edges
- low opacity
- strong near-black overlay approximately 60–75%

The final background should inherit the mood and color of each song while remaining dark enough for white text and controls.

The foreground artwork itself must remain sharp.

Do not make the blurred background overly saturated.

The page should still feel predominantly dark.

==================================================
TOP BAR
==================================================

Keep the top controls minimal.

Top-left or top-right:
Close / Back control

Optional opposite side:
existing overflow menu if currently supported

Do not add a full navigation header.

The player should feel immersive.

==================================================
LEFT COLUMN — TRACK
==================================================

Show:

Large album artwork

Track title

Small secondary metadata

Examples:
Genre
Duration

Do NOT make “AI Generated” a dominant piece of metadata.

If it must remain for existing functionality, reduce its visual hierarchy.

Prioritize:

Track title
Artwork
Music metadata

==================================================
RIGHT COLUMN — LYRICS
==================================================

Show the existing lyrics text.

IMPORTANT:
The current product does NOT have timestamped lyrics.

Therefore:
- keep lyrics static
- do not highlight lines based on playback position
- do not create fake synced lyrics behavior

Use a clean editorial lyrics layout.

Lyrics should be:
- large enough to read comfortably
- muted white / gray
- spacious line-height
- vertically scrollable if the lyrics exceed the available height

Do not place the lyrics inside a heavy boxed card.

Let them exist naturally in the right side of the composition.

Add a small label:

LYRICS

or simply:

Lyrics

Do not over-design this area.

==================================================
PLAYBACK CONTROLS
==================================================

Keep the existing functionality:

- previous
- play / pause
- next
- progress bar
- elapsed time
- total duration
- volume

Do not add new playback functions.

Place the playback controls as a unified player area toward the lower portion of the screen.

Recommended hierarchy:

Progress bar

Elapsed time                         Total time

Previous       Play / Pause       Next

Volume

The play / pause control should have the strongest emphasis.

Keep the progress bar thin and refined.

Avoid bright blue controls.

Use the same monochrome interaction system as the Workspace.

==================================================
INSTRUMENTAL TRACK STATE
==================================================

If the current song has no lyrics:

Do NOT show an empty Lyrics column.

Instead, adapt the composition.

Increase the visual prominence of the album artwork.

Center or slightly expand the artwork composition.

Show subtle metadata:

Instrumental

Do NOT create a waveform visualizer just to fill the empty space.

The absence of lyrics should make the screen more visually minimal.

==================================================
RESPONSIVE BEHAVIOR
==================================================

Desktop:
Use the two-column Artwork + Lyrics composition.

Mobile:
Switch to a vertical player experience.

Recommended mobile hierarchy:

Album artwork

Track title

Progress

Playback controls

Lyrics below

Lyrics may scroll as part of the page or within a dedicated expandable area.

Do not simply shrink the desktop columns.

Artwork should remain visually dominant.

==================================================
MINI PLAYER → FULL PLAYER CONTINUITY
==================================================

The full-screen player should feel like an expansion of the existing Workspace mini player.

When the user opens the full player:

- preserve the same active track
- preserve playback position
- preserve play / pause state

Do not restart the track.

Use the same artwork, title, and controls.

Visually, the mini player should feel like the compact version of this immersive player.

==================================================
VISUAL STYLE
==================================================

Match the redesigned La Musica system:

- near-black foundation
- artwork-driven ambient color
- warm white primary text
- restrained gray secondary typography
- subtle UI controls
- generous whitespace
- premium editorial music aesthetic

Avoid:
- blue SaaS UI
- generic music visualizers
- neon gradient controls
- large cards around every section
- glassmorphism
- excessive shadows
- decorative AI graphics
- fake synced lyrics

The final experience should feel like:

“I am listening to my finished song.”

not:

“I am viewing a generated audio file.”