Redesign Step 3 and the post-create generation experience inside the existing La Musica “Create song” modal.

Keep the existing 3-step flow:

1. Lyrics
2. Sound
3. Create

Do NOT add a separate Review step.

The goal of Step 3 is to make the final creation action extremely simple, then turn the waiting period into a premium music-creation experience.

==================================================
STATE 1 — STEP 3: CREATE
==================================================

Keep Step 3 visually minimal.

Title:
Create

Supporting copy:
Your song will be added to My music when generation is complete.

Do NOT show a detailed review of lyrics or sound settings.

Do NOT add Edit controls here.

Show only the information required to confirm generation.

Credits section:

Credits required
8 credits

Available now
128 credits

Use the actual existing credit cost and available-credit values from the product.
Do not hard-code these example values in implementation.

Supporting text:

Credits are used only after you choose Create.

Primary CTA:

Create song · 8 credits

Secondary action:

Back

If the user does not have enough credits:

Show:
You need 8 credits
3 credits available

Replace the primary Create CTA with:

Get credits

Do not allow generation when credits are insufficient.

==================================================
STATE 2 — GENERATING
==================================================

After the user clicks “Create song”:

Do NOT close the Create Song modal immediately.

Transform the content of the same modal into an immersive generation state.

The modal should visually become a cinematic music-creation experience.

--------------------------------------------------
BACKGROUND VIDEO
--------------------------------------------------

Use a short seamless looping video as the main visual background of the generation state.

Video direction:

Abstract editorial music visual.

The video should feel like music, light, texture, and sound gradually taking shape.

Possible visual language:
- soft light emerging from darkness
- subtle waveform-like movement
- fine film grain
- diffused color bleeding
- slow evolving abstract composition
- artwork-like shapes gently forming and dissolving

IMPORTANT:

Avoid generic AI visuals.

Do NOT use:
- floating 3D chrome blobs
- cyberpunk tunnels
- spinning neon spheres
- strong rainbow gradients
- AI sparkle effects
- aggressive particle systems
- obvious generative-AI cliché imagery

The result should feel closer to experimental album artwork or a premium music visualizer.

Recommended video length:
approximately 6–8 seconds.

It must loop seamlessly for approximately one minute.

The first and last frames should be visually very similar.

--------------------------------------------------
VIDEO TREATMENT
--------------------------------------------------

Use the video as the background of the modal, not as a separate video card.

Add a strong dark overlay so all text remains readable.

The video should remain atmospheric and secondary to the generation status.

The user should still clearly recognize that they are waiting for a song to be created.

--------------------------------------------------
GENERATION CONTENT
--------------------------------------------------

Centered over the video:

Creating your song

Dynamic status copy underneath.

Example sequence:

Preparing your track...
Shaping your sound...
Creating your music...
Finishing your track...

Show one status at a time.

Use subtle transitions between status messages.

--------------------------------------------------
PROGRESS
--------------------------------------------------

Keep both:

- progress bar
- percentage number

Example:

──────────────
63%

IMPORTANT:

The backend does NOT provide real generation percentage.

The percentage is an estimated UI progress indicator.

Design it so it does not imply exact server progress.

Suggested behavior for later implementation:

- progress begins quickly
- gradually slows down
- never reaches 100% before the backend confirms completion
- may wait around 90–95%
- actual completion response moves progress to 100%

Do not show 100% while generation is still running.

Do not add fake technical messages such as:
“Mastering stems”
“Rendering neural layers”

Keep status language simple and user-friendly.

--------------------------------------------------
EXIT DURING GENERATION
--------------------------------------------------

Allow the user to leave the generation modal.

Show a low-emphasis action:

Back to My music

Generation continues in the background.

Do NOT add a Cancel button unless the current backend actually supports cancelling generation.

==================================================
STATE 3 — WORKSPACE WHILE GENERATING
==================================================

If the user chooses “Back to My music” while generation is still running:

Return to the Workspace.

At the TOP of the music library, insert a temporary generation row.

Example:

[ animated artwork placeholder ]

Creating your song...
Generating · This may take about a minute

Show a subtle progress indicator if appropriate.

The generation row should visually fit the existing premium music-library list.

Because La Musica currently supports only ONE generation at a time:

Disable the normal song creation entry points while generation is active.

For example:

Create song
→ disabled state

or label it:

Creating...

Do not allow another generation request until the current generation succeeds or fails.

The rest of the Workspace should remain usable.

Users may:
- search existing music
- play existing tracks
- inspect their library

==================================================
STATE 4 — GENERATION COMPLETE
==================================================

When the backend confirms generation completion:

Transition the modal or generation view into a completion state.

Give the result a strong emotional payoff.

Eyebrow:
YOUR SONG IS READY

Show prominently:

[ Generated album artwork ]

Track title

Small metadata such as:
Genre · Duration

Primary CTA:

▶ Listen now

Secondary action:

Back to My music

“Listen now” should open the existing detailed / immersive player experience.

“Back to My music” returns to the Workspace with the new song placed at the top of the library.

Do NOT automatically start audio playback.

==================================================
VISUAL STYLE
==================================================

Match the redesigned La Musica identity.

Use:
- #050505 / near-black foundation
- warm white typography
- restrained gray metadata
- large editorial spacing
- subtle borders
- premium music-brand composition
- album-art-driven color
- minimal controls

The Generation screen may be more atmospheric than the rest of the product, but it must still feel like the same La Musica brand.

Avoid:
- generic loading-screen UI
- giant spinner as the main visual
- bright blue SaaS progress states
- game-like loading animations
- excessive glowing UI
- generic AI imagery

The experience should communicate:

“My song is being created.”

not:

“The software is processing a task.”