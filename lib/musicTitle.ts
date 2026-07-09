import type { MusicGenre, MusicMood } from "@/lib/music-prompt/types";

const MAX_TITLE_CHARS = 60;

const GENERIC_TITLES = new Set([
  "untitled",
  "untitled track",
  "new track",
  "my song",
  "song title",
]);

const GENRE_LABELS: Record<MusicGenre, string> = {
  edm: "EDM",
  reggaeton: "Reggaeton",
  hiphop_trap: "Hip-Hop Trap",
  techno: "Techno",
  korean_ballad: "Korean Ballad",
  brazilian_funk: "Brazilian Funk",
  afropop_festival: "Afropop Festival",
  french_maghreb_hiphop: "French Maghreb Hip-Hop",
  football_chant: "Football Chant",
  custom: "Custom",
};

const MOOD_LABELS: Record<MusicMood, string> = {
  hard: "Hard",
  energetic: "Energetic",
  dark: "Dark",
  happy: "Happy",
  emotional: "Emotional",
  sexy: "Sexy",
  epic: "Epic",
  funny: "Funny",
  nostalgic: "Nostalgic",
  romantic: "Romantic",
  aggressive: "Aggressive",
  festival: "Festival",
};

export type MusicTitleInput = {
  lyrics?: string | null;
  instrumental?: boolean;
  genre?: MusicGenre;
  moods?: MusicMood[];
  language?: string;
  fallbackTitle?: string;
};

export function formatGenreLabel(genre?: string | null) {
  if (!genre) return "";
  return GENRE_LABELS[genre as MusicGenre] ?? titleizeToken(genre);
}

export function formatMoodLabel(mood?: string | null) {
  if (!mood) return "";
  return MOOD_LABELS[mood as MusicMood] ?? titleizeToken(mood);
}

export function buildFallbackMusicTitle({
  lyrics,
  instrumental,
  genre,
  moods,
}: MusicTitleInput): string {
  if (!instrumental) {
    const lyricsTitle = deriveTitleFromLyrics(lyrics);
    if (lyricsTitle) return lyricsTitle;
  }

  return buildContextTitle({ instrumental, genre, moods });
}

export function deriveTitleFromLyrics(lyrics?: string | null): string | null {
  const lines = normalizeLyricsLines(lyrics);
  if (!lines.length) return null;

  let inHookSection = false;
  const generalCandidates: string[] = [];

  for (const line of lines) {
    const section = line.match(
      /^\[?\s*(chorus|hook|final chorus|post chorus)\s*\]?:?$/i,
    );
    if (section) {
      inHookSection = true;
      continue;
    }

    if (/^\[?\s*(intro|verse|pre chorus|bridge|outro|drop)\s*\]?:?$/i.test(line)) {
      inHookSection = false;
      continue;
    }

    const candidate = sanitizeGeneratedTitle(line, "");
    if (!candidate) continue;
    if (inHookSection) return candidate;
    generalCandidates.push(candidate);
  }

  return generalCandidates[0] ?? null;
}

export function sanitizeGeneratedTitle(
  value: string | null | undefined,
  fallback: string,
): string {
  let title = value ?? "";
  title = title.replace(/```(?:text)?\s*([\s\S]*?)```/i, "$1");
  title = title.replace(/^\s*(song\s*)?title\s*:\s*/i, "");
  title = title.replace(/\[[^\]]+\]/g, " ");
  title = title.replace(/^["'`]+|["'`]+$/g, "");
  title = title.split(/\r?\n/)[0]?.trim() ?? "";
  title = title.replace(/\s+/g, " ").trim();
  title = title.replace(/[.!?]+$/g, "").trim();

  title = shortenTitle(title);

  if (!title || GENERIC_TITLES.has(title.toLowerCase())) return fallback;
  return title;
}

function buildContextTitle({
  instrumental,
  genre,
  moods,
}: Pick<MusicTitleInput, "instrumental" | "genre" | "moods">) {
  const genreLabel = formatGenreLabel(genre);
  const moodLabel = moods?.[0] ? formatMoodLabel(moods[0]) : "";
  const base = [moodLabel, genreLabel].filter(Boolean).join(" ");

  if (instrumental) {
    return base ? `${base} Instrumental` : "Instrumental Track";
  }

  return base ? `${base} Track` : "Untitled Track";
}

function normalizeLyricsLines(lyrics?: string | null): string[] {
  return (lyrics ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\(.+\)$/.test(line));
}

function shortenTitle(title: string) {
  const delimiterMatch = title.match(/^(.{12,}?)[,;:!?/\\-]/);
  const shortened = delimiterMatch?.[1]?.trim() || title;
  if (shortened.length <= MAX_TITLE_CHARS) return shortened;
  return `${shortened.slice(0, MAX_TITLE_CHARS - 3).trim()}...`;
}

function titleizeToken(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
