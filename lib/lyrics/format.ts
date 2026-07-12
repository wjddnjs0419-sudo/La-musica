// Shared lyrics formatting rules for the music model payload and player view.

const CANON_TAGS: Record<string, string> = {
  intro: "[Intro]",
  verse: "[Verse]",
  "verse 2": "[Verse 2]",
  "pre chorus": "[Pre Chorus]",
  prechorus: "[Pre Chorus]",
  chorus: "[Chorus]",
  hook: "[Hook]",
  "post chorus": "[Post Chorus]",
  bridge: "[Bridge]",
  "final chorus": "[Final Chorus]",
  outro: "[Outro]",
};

const SECTION_TAG_VALUES = new Set(Object.values(CANON_TAGS));

const STAGE_DIRECTION_PATTERN =
  /\b(?:instrumental|interlude|break|drop|beat|drum|drums|guitar|bass|synth|piano|solo|riff|fill|riser|build(?:\s+up)?|pause|silence|spoken|whisper|chant|clap|claps|stomp|stomps|effect|fx)\b/i;

export const CANONICAL_SECTION_TAGS = Array.from(SECTION_TAG_VALUES);

export function normalizeSectionTags(lyrics: string): string {
  return lyrics.replace(/\[([^\]]+)\]/g, (match, inner: string) => {
    const key = inner.trim().toLowerCase();
    return CANON_TAGS[key] ?? match;
  });
}

export function isSectionTagLine(line: string): boolean {
  return SECTION_TAG_VALUES.has(line.trim());
}

// Used only by sanitizeLyricsForModel (the audio-generation payload): here a
// parenthetical IS treated as a stage direction, since telling the
// generation model where instrumental gaps go is the point.
export function stripStageDirections(line: string): string {
  return line
    .replace(/\(([^)]*)\)/g, (match, inner: string) =>
      STAGE_DIRECTION_PATTERN.test(inner) ? "" : match,
    )
    .replace(/\[([^\]]*)\]/g, (match, inner: string) => {
      const normalized = normalizeSectionTags(match);
      if (isSectionTagLine(normalized)) return normalized;
      return STAGE_DIRECTION_PATTERN.test(inner) ? "" : match;
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function isStageDirectionLine(line: string): boolean {
  const trimmed = line.trim();
  const parenthetical = trimmed.match(/^\(([^)]*)\)$/);
  if (parenthetical) return STAGE_DIRECTION_PATTERN.test(parenthetical[1]);
  const bracketed = trimmed.match(/^\[([^\]]*)\]$/);
  if (bracketed && !isSectionTagLine(normalizeSectionTags(trimmed))) {
    return STAGE_DIRECTION_PATTERN.test(bracketed[1]);
  }
  return false;
}

export function sanitizeLyricsForModel(lyrics: string): string {
  const normalized = normalizeSectionTags(lyrics);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isStageDirectionLine(line))
    .map(stripStageDirections)
    .filter(Boolean);
  return lines.join("\n");
}

// Used only by lyricDisplayLines (on-screen lyrics + the ground-truth line
// list sent to Gemini for LRC alignment): parentheses are never inspected or
// stripped — "(...)" is always treated as sung content (ad-libs, backing
// vocals), since silently deleting a real sung line here means it can never
// get displayed OR synced. Only "[...]" is checked against known section
// tags / STAGE_DIRECTION_PATTERN, matching this app's convention of using
// brackets (not parens) for section/instrumental annotations.
function stripBracketDirectionsOnly(line: string): string {
  return line
    .replace(/\[([^\]]*)\]/g, (match, inner: string) => {
      const normalized = normalizeSectionTags(match);
      if (isSectionTagLine(normalized)) return normalized;
      return STAGE_DIRECTION_PATTERN.test(inner) ? "" : match;
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isBracketOnlyDirectionLine(line: string): boolean {
  const trimmed = line.trim();
  const bracketed = trimmed.match(/^\[([^\]]*)\]$/);
  if (bracketed && !isSectionTagLine(normalizeSectionTags(trimmed))) {
    return STAGE_DIRECTION_PATTERN.test(bracketed[1]);
  }
  return false;
}

// Strips a leading bracket group only when it's a recognized section tag or
// matches STAGE_DIRECTION_PATTERN — an arbitrary unrecognized bracket (e.g.
// "[uh huh] let's go") is left alone rather than silently deleted.
function stripLeadingRecognizedTag(line: string): string {
  return line
    .replace(/^\[([^\]]+)\]\s*/, (match, inner: string) => {
      const normalized = normalizeSectionTags(match);
      if (isSectionTagLine(normalized)) return "";
      return STAGE_DIRECTION_PATTERN.test(inner) ? "" : match;
    })
    .trim();
}

export function lyricDisplayLines(lyrics: string): string[] {
  return normalizeSectionTags(lyrics)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isSectionTagLine(line))
    .filter((line) => !isBracketOnlyDirectionLine(line))
    .map(stripBracketDirectionsOnly)
    .map(stripLeadingRecognizedTag)
    .filter(Boolean)
    .filter((line) => !isSectionTagLine(line));
}
