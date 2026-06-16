# 01_GENRE_PRESETS

Source of truth: `lib/music-prompt/presets.ts`

Purpose: Use this file as ChatGPT Project context when writing style guidance, lyrics, or prompt suggestions for La Musica. These are the genres currently supported by the app. Genre guidance should describe concrete musical grammar, not just labels like "EDM beat" or "reggaeton beat".

Important rule: Genre presets must not decide whether a track has vocals. Vocal/instrumental behavior is controlled separately by `VocalMode`.

## Supported Genres

### EDM (`edm`)

Concrete sound grammar:

- Festival main-stage big-room EDM, chart-ready commercial hook
- Four-on-the-floor dance pulse around 126-130 BPM
- Hard sidechained kick
- Offbeat open hats
- Towering layered supersaw leads
- Screaming chopped vocal-chop hook texture
- Wide sub bass
- Explosive snare-roll build-ups
- White-noise riser sweeps
- Euphoric main-stage drop dynamics
- Loud radio-ready electronic mix

Use this when the user asks for high-energy electronic music, workout music, festival energy, drops, or dance-oriented tracks.

### Reggaeton (`reggaeton`)

Concrete sound grammar:

- Modern Medellin-style commercial reggaeton, glossy radio-pop sheen
- Groove-first dembow pocket
- Kick on the downbeats
- Snare-clap accents between beats
- Syncopated shaker and rim percussion
- Rolling sub and 808 bass following the groove
- Catchy plucked synth or nylon-guitar hook
- Warm tropical chord stabs
- Confident late-night perreo energy
- Tight chart-ready Latin urban mix

Use this when the user asks for Latin urban club energy, Spanish hook potential, dembow groove, danceable rhythm, or tropical nightlife.

### Hip-hop Trap (`hiphop_trap`)

Concrete sound grammar:

- Modern commercial trap
- Hard-hitting half-time trap drums
- Booming distorted 808 slides
- Crisp 16th-note hi-hat rolls with triplet fills
- Punchy snare on beat three
- Dark cinematic minor-key piano or bell motif
- Atmospheric pads
- Sparse menacing negative space
- Open pocket for rhythmic lead phrasing
- Loud streaming-ready low-end heavy mix

Auto vocal behavior: This genre resolves to `rap_vocal` when Vocal is `auto`.

### Techno (`techno`)

Concrete sound grammar:

- Peak-time warehouse techno
- Relentless pounding four-on-the-floor kick
- Rolling 16th-note bassline
- Driving closed-hat pulse
- Metallic percussion loops
- Hypnotic dark minor synth sequence
- Long gradual filter automation
- Filtered risers
- Intense breakdown tension
- Cavernous warehouse reverb
- Loud club master

Use this when the user asks for warehouse, hypnotic, driving, dark club, or continuous rhythm.

### Korean Ballad (`korean_ballad`)

Concrete sound grammar:

- Modern Korean drama OST ballad
- Slow-to-mid tempo arrangement
- Intimate piano or acoustic guitar intro
- Warm piano arpeggios
- Lush string orchestra swells
- Restrained verse dynamics
- Surging emotional pre-chorus lift
- Huge belted final-chorus payoff
- Dramatic drum build into the last chorus
- Polished radio-ready mix

Auto vocal behavior: This genre resolves to `male_vocal` when Vocal is `auto`.

### Brazilian Funk (`brazilian_funk`)

Concrete sound grammar:

- Modern baile funk, raw favela party energy
- Tamborzao-driven rhythmic pattern
- Immediate rhythmic hook
- Fast syncopated kick and clap hits
- Heavy distorted 808 pulses
- Baile percussion fills
- Whistle accents
- Short call-and-response hook spaces
- Gritty loud club loudness

Auto vocal behavior: This genre resolves to `male_vocal` when Vocal is `auto`.

### French Afro-pop (`afropop_festival`)

Concrete sound grammar:

- Modern commercial Afrobeats festival sound, sunny stadium-pop polish
- Afrobeats drum pocket
- Syncopated kick pattern
- Shuffling hats
- Layered djembe and hand percussion
- Bright clean guitar riffs
- Warm brass stabs
- Buoyant melodic bassline
- Communal final-hook lift
- Spacious radio-ready festival dance mix

Auto vocal behavior: This genre resolves to `male_vocal` when Vocal is `auto`.

### Maghreb French Hip-hop (`french_maghreb_hiphop`)

Concrete sound grammar:

- Modern French-Maghreb club rap
- North African melodic minor phrases
- Darbuka-style percussion layers
- Bouncy French hip-hop drum groove
- Deep 808 bass
- Warm oriental synth lead
- Handclap accents
- Open pocket for rhythmic lead phrasing
- Anthemic club-ready chorus lift
- Triumphant global nightlife energy

Auto vocal behavior: This genre resolves to `rap_vocal` when Vocal is `auto`.

### Football Chant (`football_chant`)

Concrete sound grammar:

- Massive stadium anthem, chantable terrace energy
- Stomp-clap pulse
- Big floor toms and snare hits
- Brass stabs
- Whistle accents
- Simple call-and-response hook shape
- Short repeatable hook phrasing
- Wide crowd-sized reverb
- Explosive sports-celebration chorus

Auto vocal behavior: This genre resolves to `crowd_chant` when Vocal is `auto`.

### Custom (`custom`)

`custom` means no genre preset is injected. The user's prompt carries the style.

## Mood Presets

Only the first two selected moods are applied to avoid over-weighting options.

- `hard`: harder transients, compressed impact, aggressive edge
- `energetic`: driving pulse, lively motion, danceable lift
- `dark`: minor-key color, nocturnal tension, shadowy atmosphere
- `happy`: bright harmony, joyful lift, sunny tone
- `emotional`: heartfelt dynamics, dramatic lift, expressive phrasing
- `sexy`: smooth late-night groove, confident warmth, restrained tension
- `epic`: large-scale dynamics, cinematic rise, victorious payoff
- `funny`: playful timing, quirky accents, witty bounce
- `nostalgic`: warm texture, bittersweet harmony, reflective feel
- `romantic`: soft dynamics, dreamy space, intimate warmth
- `aggressive`: bold drums, hard-hitting accents, rebellious pressure
- `festival`: outdoor-stage energy, big chorus lift, celebratory motion

## Use-case Presets

- `workout`: steady motivational drive, strong beat continuity, physical momentum
- `club`: dancefloor low-end, clean groove repetition, late-night mix density
- `party`: catchy hook space, playful rhythm, group-friendly energy
- `short_form`: immediate opening hook, strong first five seconds, loopable payoff
- `gaming`: high-adrenaline pacing, sharp accents, highlight-montage momentum
- `travel_vlog`: forward motion, scenic brightness, upbeat lifestyle atmosphere
- `sports_chant`: chantable hook shape, claps and brass emphasis, stadium lift
- `comedy_roast`: bouncy timing, playful tension, room for funny storytelling
- `background`: clean arrangement, moderate density, supportive BGM balance
- `personal_song`: clear emotional arc, memorable hook, intimate storytelling space
- `custom`: no use-case preset is injected
