# Music Prompt Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile simple user music intent + structured options into a high-quality English MiniMax prompt, hidden from normal users, stored in `musics.metadata`.

**Architecture:** A pure-logic module `lib/music-prompt/` (types, presets, sanitizer, lyrics, compiler) runs server-side inside `app/api/music/generate/route.ts`. The prompt box gains Genre/Mood/Use-case/Vocal selects; the existing Instrumental toggle is folded into the Vocal select. Compiled prompt goes to Replicate and is persisted in metadata. No DB migration.

**Tech Stack:** TypeScript, Next.js 16 App Router, React 19, vitest (new, for the pure module only), Replicate `minimax/music-2.6`.

---

## Notes for the implementer

- The task doc's "Expected final prompt should contain" lists are **conceptual**, not literal substrings. Tests below assert on substrings the formula actually emits (preset text), which is the real contract.
- `buildMinimaxInput` in `lib/music.ts` already drops `lyrics` when `is_instrumental` is true, so the compiler returns `undefined` lyrics for instrumental.
- `components/music-workspace.tsx` `handleSend` forwards the whole `GenerateRequest` via `JSON.stringify` — **no change needed there** once `GenerateRequest` is extended.
- Korean-only communication; validate with `npm run build` + `npm run lint` after code tasks.

## File structure

- Create `lib/music-prompt/types.ts` — types + `PROMPT_COMPILER_VERSION`.
- Create `lib/music-prompt/presets.ts` — preset maps + `resolveVocalMode` + reference map.
- Create `lib/music-prompt/sanitizeReferences.ts` — reference/risky-phrase sanitizer.
- Create `lib/music-prompt/buildLyricsPayload.ts` — lyrics payload normalizer.
- Create `lib/music-prompt/buildMusicPrompt.ts` — main compiler.
- Create `lib/music-prompt/index.ts` — `compileMusicPrompt` entry + re-exports.
- Create `lib/music-prompt/*.test.ts` — vitest unit tests.
- Modify `lib/music.ts` — extend `GenerateRequest`.
- Modify `app/api/music/generate/route.ts` — call compiler, store metadata.
- Modify `components/prompt-box.tsx` — structured option selects.
- Create `docs/MINIMAX_PROMPT_ENGINEERING.md`.
- Modify `package.json` — vitest dev dep + `test` script.

---

## Task 1: vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/music-prompt/smoke.test.ts` (temporary sanity test, deleted in Task 6)

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`
Expected: `vitest` added to devDependencies, exit 0.

- [ ] **Step 2: Add test script to `package.json`**

In the `"scripts"` block, add after the `"lint"` line:

```json
    "lint": "eslint",
    "test": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/music-prompt/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Create `lib/music-prompt/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/music-prompt/smoke.test.ts
git commit -m "chore: add vitest for music-prompt module"
```

---

## Task 2: types.ts

**Files:**
- Create: `lib/music-prompt/types.ts`

No separate test (type-only file); `PROMPT_COMPILER_VERSION` is exercised in Task 6.

- [ ] **Step 1: Create `lib/music-prompt/types.ts`**

```ts
// Music Prompt Compiler — shared types and version.

export const PROMPT_COMPILER_VERSION = "v1";

export type MusicGenre =
  | "edm"
  | "reggaeton"
  | "hiphop_trap"
  | "techno"
  | "korean_ballad"
  | "brazilian_funk"
  | "afropop_festival"
  | "french_maghreb_hiphop"
  | "football_chant"
  | "custom";

export type MusicMood =
  | "hard"
  | "energetic"
  | "dark"
  | "happy"
  | "emotional"
  | "sexy"
  | "epic"
  | "funny"
  | "nostalgic"
  | "romantic"
  | "aggressive"
  | "festival";

export type MusicUseCase =
  | "workout"
  | "club"
  | "party"
  | "short_form"
  | "gaming"
  | "travel_vlog"
  | "sports_chant"
  | "comedy_roast"
  | "background"
  | "personal_song"
  | "custom";

export type VocalMode =
  | "instrumental"
  | "male_vocal"
  | "female_vocal"
  | "rap_vocal"
  | "crowd_chant"
  | "auto";

// Concrete vocal mode after `auto` is resolved.
export type ResolvedVocalMode = Exclude<VocalMode, "auto">;

export interface BuildMusicPromptInput {
  userDescription: string;
  genre?: MusicGenre;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  language?: string;
  lyrics?: string;
  bpm?: number;
  key?: string;
  durationHint?: string;
  referenceText?: string;
}

export interface CompiledPromptMetadata {
  raw_user_description: string;
  final_music_prompt: string;
  prompt_version: string;
  genre?: MusicGenre;
  moods?: MusicMood[];
  use_case?: MusicUseCase;
  vocal_mode: ResolvedVocalMode;
  language?: string;
}

export interface CompiledPrompt {
  prompt: string;
  lyrics?: string;
  instrumental: boolean;
  metadata: CompiledPromptMetadata;
}
```

- [ ] **Step 2: Typecheck compiles**

Run: `npx tsc --noEmit`
Expected: no errors (or only pre-existing unrelated ones — none expected from this file).

- [ ] **Step 3: Commit**

```bash
git add lib/music-prompt/types.ts
git commit -m "feat: add music-prompt compiler types"
```

---

## Task 3: presets.ts (+ resolveVocalMode, reference map)

**Files:**
- Create: `lib/music-prompt/presets.ts`
- Test: `lib/music-prompt/presets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  REFERENCE_MAP,
  resolveVocalMode,
} from "./presets";

describe("presets", () => {
  it("has a preset for every concrete genre", () => {
    for (const g of ["edm", "reggaeton", "hiphop_trap", "techno", "korean_ballad", "brazilian_funk", "afropop_festival", "french_maghreb_hiphop", "football_chant"] as const) {
      expect(GENRE_PRESETS[g].length).toBeGreaterThan(20);
    }
  });

  it("edm preset mentions a drop and kick", () => {
    expect(GENRE_PRESETS.edm).toContain("drop");
    expect(GENRE_PRESETS.edm).toContain("kick");
  });

  it("has mood/use-case/vocal presets", () => {
    expect(MOOD_PRESETS.hard).toContain("aggressive");
    expect(USE_CASE_PRESETS.workout).toContain("gym");
    expect(VOCAL_PRESETS.male_vocal).toContain("male vocal");
  });

  it("reference map covers Bad Bunny", () => {
    const hit = REFERENCE_MAP.find(([re]) => re.test("bad bunny style"));
    expect(hit?.[1]).toContain("Latin trap");
  });

  it("resolveVocalMode: explicit wins", () => {
    expect(resolveVocalMode({ userDescription: "x", vocalMode: "female_vocal" })).toBe("female_vocal");
  });

  it("resolveVocalMode: auto with lyrics -> male_vocal", () => {
    expect(resolveVocalMode({ userDescription: "x", vocalMode: "auto", lyrics: "[Verse] hi" })).toBe("male_vocal");
  });

  it("resolveVocalMode: auto edm -> instrumental", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "edm" })).toBe("instrumental");
  });

  it("resolveVocalMode: auto hiphop -> rap_vocal", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "hiphop_trap" })).toBe("rap_vocal");
  });

  it("resolveVocalMode: auto football -> crowd_chant", () => {
    expect(resolveVocalMode({ userDescription: "x", genre: "football_chant" })).toBe("crowd_chant");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- presets`
Expected: FAIL — cannot resolve `./presets`.

- [ ] **Step 3: Create `lib/music-prompt/presets.ts`**

```ts
import type {
  BuildMusicPromptInput,
  MusicGenre,
  MusicMood,
  MusicUseCase,
  ResolvedVocalMode,
} from "./types";

// Strong default style prompts per genre (verbatim from product spec).
export const GENRE_PRESETS: Record<Exclude<MusicGenre, "custom">, string> = {
  edm: "Hard energetic EDM festival instrumental, massive big room drop, aggressive saw synth lead, pounding kick drum, distorted electro bass, explosive build-up, intense risers, crowd festival energy, polished mainstage EDM production",
  reggaeton: "Instrumental Latin reggaeton club beat, strong dembow rhythm, punchy kick, tight snare, deep 808 bass, syncopated Latin percussion, catchy plucked synth lead, warm tropical accents, polished modern Latin urban production",
  hiphop_trap: "Dark hip-hop trap instrumental, heavy 808 bass, crisp hi-hat rolls, punchy snare, eerie piano loop, atmospheric pads, deep sub bass, bouncy groove, freestyle-ready modern rap beat, clean polished mix",
  techno: "Hard driving techno instrumental, powerful four-on-the-floor kick, rolling bassline, hypnotic synth sequence, industrial percussion, dark warehouse atmosphere, evolving filter sweeps, intense club mix",
  korean_ballad: "Emotional 2000s Korean male ballad, dramatic breakup song, heartfelt male vocal, powerful high-note chorus, warm piano, emotional string orchestra, acoustic guitar, gradual drum build-up, explosive final chorus, polished Korean karaoke ballad production",
  brazilian_funk: "Brazilian funk carioca inspired party anthem, aggressive tamborzao rhythm, heavy 808 bass, fast percussion, whistle hits, clap rhythm, viral dance energy, playful chant hook, polished club mix",
  afropop_festival: "French Afro-pop festival anthem, joyful African vocal performance, powerful Afrobeat drums, energetic djembe percussion, bright guitar riffs, warm brass section, heavy bassline, crowd chanting, sunny outdoor festival atmosphere",
  french_maghreb_hiphop: "Maghreb-inspired French hip-hop and dance anthem, North African melodic influence, French rap vocal, catchy club chorus, bouncy drums, warm oriental synth melodies, darbuka-style percussion, deep 808 bass, triumphant global nightlife mood",
  football_chant: "High-energy football stadium anthem, powerful crowd vocals, loud drums, heavy bass, brass hits, clap rhythm, whistle sounds, easy sing-along hook, explosive chorus, sports celebration atmosphere",
};

export const MOOD_PRESETS: Record<MusicMood, string> = {
  hard: "aggressive, intense, powerful, high-impact",
  energetic: "fast-moving, exciting, danceable, high-energy",
  dark: "minor key, moody, nocturnal, cinematic",
  happy: "bright, joyful, uplifting, sunny",
  emotional: "heartfelt, dramatic, melancholic, expressive",
  sexy: "seductive, smooth, late-night, confident",
  epic: "large-scale, cinematic, victorious, anthemic",
  funny: "playful, comedic, meme-like, witty",
  nostalgic: "warm, bittersweet, reflective, old memories",
  romantic: "soft, dreamy, intimate, warm",
  aggressive: "bold, punchy, hard-hitting, rebellious",
  festival: "crowd energy, outdoor stage, celebration, chantable",
};

export const USE_CASE_PRESETS: Record<Exclude<MusicUseCase, "custom">, string> = {
  workout: "gym energy, driving rhythm, motivational intensity",
  club: "nightclub-ready groove, heavy low-end, dancefloor energy",
  party: "fun group energy, catchy hook, playful rhythm",
  short_form: "immediate hook, strong first 5 seconds, viral loop potential",
  gaming: "high-adrenaline action, highlight montage energy",
  travel_vlog: "sunny movement, scenic atmosphere, upbeat lifestyle mood",
  sports_chant: "stadium crowd, chantable hook, claps and brass",
  comedy_roast: "playful diss energy, funny storytelling, bouncy beat",
  background: "usable as BGM, clean arrangement, not too distracting",
  personal_song: "personal story, memorable hook, emotional clarity",
};

// Direction injected per resolved vocal mode.
export const VOCAL_PRESETS: Record<ResolvedVocalMode, string> = {
  instrumental: "fully instrumental, no vocals, no lyrics",
  male_vocal: "expressive male vocal",
  female_vocal: "expressive female vocal",
  rap_vocal: "confident rap vocal, rhythmic delivery",
  crowd_chant: "crowd chant vocals, easy sing-along hook",
};

// Known artist/song references -> generic descriptors (copyright-safe).
export const REFERENCE_MAP: Array<[RegExp, string]> = [
  [/bad\s*bunny/gi, "fast Latin reggaeton and Latin trap club sound, dark synths, deep 808 bass, confident low male vocal"],
  [/cris\s*mj|una\s*noche\s*en\s*medellin/gi, "instrumental Latin reggaeton club beat, dreamy nighttime urban atmosphere, smooth romantic synth melody, deep 808 bass, fast dembow rhythm"],
  [/soolking|suavemente/gi, "Maghreb-inspired French hip-hop dance anthem, North African melodic influence, club percussion, catchy French chorus"],
  [/임창정/g, "emotional 2000s Korean male karaoke ballad, dramatic breakup mood, powerful high-note chorus, piano and string arrangement"],
];

// Genres that imply vocals when the user leaves vocal mode on auto.
const RAP_GENRES = new Set<MusicGenre>(["hiphop_trap", "french_maghreb_hiphop"]);
const CHANT_GENRES = new Set<MusicGenre>(["football_chant"]);
const SUNG_GENRES = new Set<MusicGenre>(["korean_ballad", "afropop_festival", "brazilian_funk"]);

// Resolve `auto`/undefined vocal mode into a concrete one.
export function resolveVocalMode(input: BuildMusicPromptInput): ResolvedVocalMode {
  if (input.vocalMode && input.vocalMode !== "auto") return input.vocalMode;
  if (input.lyrics && input.lyrics.trim()) return "male_vocal";
  if (input.genre && RAP_GENRES.has(input.genre)) return "rap_vocal";
  if (input.genre && CHANT_GENRES.has(input.genre)) return "crowd_chant";
  if (input.genre && SUNG_GENRES.has(input.genre)) return "male_vocal";
  return "instrumental";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- presets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/music-prompt/presets.ts lib/music-prompt/presets.test.ts
git commit -m "feat: add music-prompt presets and vocal-mode resolver"
```

---

## Task 4: sanitizeReferences.ts

**Files:**
- Create: `lib/music-prompt/sanitizeReferences.ts`
- Test: `lib/music-prompt/sanitizeReferences.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { sanitizeReferences } from "./sanitizeReferences";

describe("sanitizeReferences", () => {
  it("replaces Bad Bunny with generic descriptors", () => {
    const out = sanitizeReferences("Bad Bunny style fast reggaeton");
    expect(out.toLowerCase()).not.toContain("bad bunny");
    expect(out).toContain("Latin trap");
  });

  it("replaces 임창정", () => {
    const out = sanitizeReferences("임창정 느낌 발라드");
    expect(out).not.toContain("임창정");
    expect(out).toContain("Korean male karaoke ballad");
  });

  it("strips risky phrasing", () => {
    const out = sanitizeReferences("make it exactly like this, 똑같이 그대로");
    expect(out.toLowerCase()).not.toContain("exactly like");
    expect(out).not.toContain("똑같이");
    expect(out).not.toContain("그대로");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeReferences("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sanitizeReferences`
Expected: FAIL — cannot resolve `./sanitizeReferences`.

- [ ] **Step 3: Create `lib/music-prompt/sanitizeReferences.ts`**

```ts
import { REFERENCE_MAP } from "./presets";

// Phrasing that asks the model to copy an existing work — removed outright.
const RISKY_PATTERNS: RegExp[] = [
  /\bsound(s)?\s+exactly\s+like\b/gi,
  /\bexactly\s+like\b/gi,
  /\bsame\s+as\b/gi,
  /\bcopy\b/gi,
  /똑같이/g,
  /동일하게/g,
  /그대로/g,
  /가사도\s*동일/g,
];

// Convert artist/song references and risky phrasing into copyright-safe,
// generic musical descriptors. Does NOT append the copyright line — the
// compiler adds that once at the end.
export function sanitizeReferences(text: string): string {
  if (!text || !text.trim()) return "";
  let out = text;
  for (const [pattern, descriptor] of REFERENCE_MAP) {
    out = out.replace(pattern, descriptor);
  }
  for (const risky of RISKY_PATTERNS) {
    out = out.replace(risky, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sanitizeReferences`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/music-prompt/sanitizeReferences.ts lib/music-prompt/sanitizeReferences.test.ts
git commit -m "feat: add reference sanitizer for music prompts"
```

---

## Task 5: buildLyricsPayload.ts

**Files:**
- Create: `lib/music-prompt/buildLyricsPayload.ts`
- Test: `lib/music-prompt/buildLyricsPayload.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildLyricsPayload } from "./buildLyricsPayload";

describe("buildLyricsPayload", () => {
  it("returns undefined for instrumental", () => {
    expect(
      buildLyricsPayload({ userDescription: "edm", vocalMode: "instrumental" }, "instrumental"),
    ).toBeUndefined();
  });

  it("returns undefined when vocal but no lyrics", () => {
    expect(
      buildLyricsPayload({ userDescription: "ballad", vocalMode: "male_vocal" }, "male_vocal"),
    ).toBeUndefined();
  });

  it("normalizes tag casing", () => {
    const out = buildLyricsPayload(
      { userDescription: "x", vocalMode: "male_vocal", lyrics: "[verse]\nhello\n[CHORUS]\nworld" },
      "male_vocal",
    );
    expect(out).toContain("[Verse]");
    expect(out).toContain("[Chorus]");
    expect(out).not.toContain("[verse]");
  });

  it("wraps unstructured lyrics in a Verse tag", () => {
    const out = buildLyricsPayload(
      { userDescription: "x", vocalMode: "male_vocal", lyrics: "just some words" },
      "male_vocal",
    );
    expect(out).toContain("[Verse]");
    expect(out).toContain("just some words");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- buildLyricsPayload`
Expected: FAIL — cannot resolve `./buildLyricsPayload`.

- [ ] **Step 3: Create `lib/music-prompt/buildLyricsPayload.ts`**

```ts
import type { BuildMusicPromptInput, ResolvedVocalMode } from "./types";

const MAX_LYRICS_CHARS = 3500;

// Canonical section tag spellings keyed by lowercase form.
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

function normalizeTags(lyrics: string): string {
  return lyrics.replace(/\[([^\]]+)\]/g, (match, inner: string) => {
    const key = inner.trim().toLowerCase();
    return CANON_TAGS[key] ?? match;
  });
}

// Build the lyrics field sent to MiniMax. Instrumental songs carry no sung
// words (the integration drops lyrics when is_instrumental is true). For vocal
// songs, preserve the user's words and normalize section tags; wrap
// unstructured input in a single [Verse] tag.
export function buildLyricsPayload(
  input: BuildMusicPromptInput,
  resolvedVocalMode: ResolvedVocalMode,
): string | undefined {
  if (resolvedVocalMode === "instrumental") return undefined;

  const raw = input.lyrics?.trim();
  if (!raw) return undefined;

  const hasTags = /\[[^\]]+\]/.test(raw);
  const payload = hasTags ? normalizeTags(raw) : `[Verse]\n${raw}`;
  return payload.slice(0, MAX_LYRICS_CHARS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- buildLyricsPayload`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/music-prompt/buildLyricsPayload.ts lib/music-prompt/buildLyricsPayload.test.ts
git commit -m "feat: add lyrics payload builder"
```

---

## Task 6: buildMusicPrompt.ts + index.ts (the compiler)

**Files:**
- Create: `lib/music-prompt/buildMusicPrompt.ts`
- Create: `lib/music-prompt/index.ts`
- Test: `lib/music-prompt/buildMusicPrompt.test.ts`
- Delete: `lib/music-prompt/smoke.test.ts`

- [ ] **Step 1: Write the failing test (the 4 task examples)**

```ts
import { describe, it, expect } from "vitest";
import { compileMusicPrompt } from "./index";
import { PROMPT_COMPILER_VERSION } from "./types";

const COPYRIGHT = "original composition only, do not imitate any specific artist";

describe("compileMusicPrompt", () => {
  it("example 1: hard EDM workout instrumental @128", () => {
    const r = compileMusicPrompt({
      userDescription: "헬스장에서 들을 하드한 EDM",
      genre: "edm",
      moods: ["hard", "energetic"],
      useCase: "workout",
      vocalMode: "instrumental",
      bpm: 128,
    });
    expect(r.instrumental).toBe(true);
    expect(r.prompt).toContain("EDM");
    expect(r.prompt).toContain("pounding kick drum");
    expect(r.prompt).toContain("gym energy");
    expect(r.prompt).toContain("no vocals, no lyrics");
    expect(r.prompt).toContain("polished mainstage EDM production");
    expect(r.prompt).toContain("128 BPM");
    expect(r.prompt).toContain(COPYRIGHT);
    expect(r.prompt.length).toBeLessThanOrEqual(2000);
    expect(r.lyrics).toBeUndefined();
    expect(r.metadata.prompt_version).toBe(PROMPT_COMPILER_VERSION);
    expect(r.metadata.vocal_mode).toBe("instrumental");
  });

  it("example 2: travel reggaeton instrumental", () => {
    const r = compileMusicPrompt({
      userDescription: "친구들이랑 여행 영상에 쓸 레게톤",
      genre: "reggaeton",
      moods: ["happy", "energetic"],
      useCase: "travel_vlog",
      vocalMode: "instrumental",
    });
    expect(r.prompt).toContain("Latin reggaeton");
    expect(r.prompt).toContain("dembow rhythm");
    expect(r.prompt).toContain("sunny movement");
    expect(r.prompt).toContain("no vocals, no lyrics");
    expect(r.prompt).toContain(COPYRIGHT);
  });

  it("example 3: emotional korean ballad male vocal", () => {
    const r = compileMusicPrompt({
      userDescription: "비 오는 밤 소주 마시면서 생각나는 한국 발라드",
      genre: "korean_ballad",
      moods: ["emotional", "nostalgic"],
      vocalMode: "male_vocal",
      language: "Korean",
      lyrics: "[verse]\n비가 내린다",
    });
    expect(r.instrumental).toBe(false);
    expect(r.prompt).toContain("Korean male ballad");
    expect(r.prompt).toContain("string orchestra");
    expect(r.prompt).toContain("rich full instrumental backing");
    expect(r.prompt).toContain("no acapella sections");
    expect(r.prompt).toContain(COPYRIGHT);
    expect(r.lyrics).toContain("[Verse]");
    expect(r.metadata.language).toBe("Korean");
  });

  it("example 4: Bad Bunny reference is sanitized away", () => {
    const r = compileMusicPrompt({
      userDescription: "Bad Bunny 스타일 빠른 레게톤",
      referenceText: "Bad Bunny",
      genre: "reggaeton",
      moods: ["sexy", "energetic"],
      vocalMode: "instrumental",
    });
    expect(r.prompt.toLowerCase()).not.toContain("bad bunny");
    expect(r.prompt).toContain("Latin trap");
    expect(r.prompt).toContain("808 bass");
    expect(r.prompt).toContain(COPYRIGHT);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- buildMusicPrompt`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Create `lib/music-prompt/buildMusicPrompt.ts`**

```ts
import type { BuildMusicPromptInput, CompiledPrompt } from "./types";
import { PROMPT_COMPILER_VERSION } from "./types";
import {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  resolveVocalMode,
} from "./presets";
import { sanitizeReferences } from "./sanitizeReferences";
import { buildLyricsPayload } from "./buildLyricsPayload";

const MAX_PROMPT_CHARS = 2000;

const COPYRIGHT_LINE =
  "original composition only, do not imitate any specific artist, song, melody, or copyrighted track.";

const INSTRUMENTAL_BOOSTER =
  "full instrumental arrangement, strong instrumental presence, polished professional mix, clear structure, no vocals, no lyrics, no sparse arrangement";

const VOCAL_BOOSTER =
  "vocal-centered but with rich full instrumental backing, strong chorus impact, polished professional mix, no acapella sections, no empty background";

// Compile a simple user intent + structured options into a dense English
// MiniMax prompt following the 12-part formula.
export function buildMusicPrompt(input: BuildMusicPromptInput): CompiledPrompt {
  const raw = input.userDescription?.trim() ?? "";
  const vocalMode = resolveVocalMode(input);
  const instrumental = vocalMode === "instrumental";

  // 1. User intent + reference text, run through the sanitizer.
  const refSource = [input.referenceText, raw].filter(Boolean).join(". ");
  const sanitizedIntent = sanitizeReferences(refSource);

  const parts: string[] = [];

  // 2. Genre preset (skipped for custom/unset — sanitized intent carries style).
  if (input.genre && input.genre !== "custom") {
    parts.push(GENRE_PRESETS[input.genre]);
  }

  // 1. User intent summary.
  if (sanitizedIntent) parts.push(sanitizedIntent);

  // 3. Mood preset(s).
  const moods = (input.moods ?? []).map((m) => MOOD_PRESETS[m]).filter(Boolean);
  if (moods.length) parts.push(moods.join(", "));

  // 4. Use-case preset.
  if (input.useCase && input.useCase !== "custom") {
    parts.push(USE_CASE_PRESETS[input.useCase]);
  }

  // 9. Vocal/instrumental direction.
  parts.push(VOCAL_PRESETS[vocalMode]);

  // 10. Production/mix quality booster.
  parts.push(instrumental ? INSTRUMENTAL_BOOSTER : VOCAL_BOOSTER);

  // 11. BPM / key if provided.
  if (typeof input.bpm === "number" && input.bpm > 0) parts.push(`${input.bpm} BPM`);
  if (input.key && input.key.trim()) parts.push(`key of ${input.key.trim()}`);

  // 12. Safety/copyright instruction (always).
  parts.push(COPYRIGHT_LINE);

  const prompt = parts
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_CHARS);

  const lyrics = buildLyricsPayload(input, vocalMode);

  return {
    prompt,
    lyrics,
    instrumental,
    metadata: {
      raw_user_description: raw,
      final_music_prompt: prompt,
      prompt_version: PROMPT_COMPILER_VERSION,
      genre: input.genre,
      moods: input.moods,
      use_case: input.useCase,
      vocal_mode: vocalMode,
      language: input.language,
    },
  };
}
```

- [ ] **Step 4: Create `lib/music-prompt/index.ts`**

```ts
export * from "./types";
export { buildMusicPrompt } from "./buildMusicPrompt";
export { sanitizeReferences } from "./sanitizeReferences";
export { buildLyricsPayload } from "./buildLyricsPayload";
export {
  GENRE_PRESETS,
  MOOD_PRESETS,
  USE_CASE_PRESETS,
  VOCAL_PRESETS,
  resolveVocalMode,
} from "./presets";

import type { BuildMusicPromptInput, CompiledPrompt } from "./types";
import { buildMusicPrompt } from "./buildMusicPrompt";

// Primary entry point for callers.
export function compileMusicPrompt(input: BuildMusicPromptInput): CompiledPrompt {
  return buildMusicPrompt(input);
}
```

- [ ] **Step 5: Delete the smoke test**

Run: `git rm lib/music-prompt/smoke.test.ts`

- [ ] **Step 6: Run all module tests**

Run: `npm test`
Expected: all pass (presets, sanitizeReferences, buildLyricsPayload, buildMusicPrompt).

- [ ] **Step 7: Commit**

```bash
git add lib/music-prompt/buildMusicPrompt.ts lib/music-prompt/index.ts lib/music-prompt/buildMusicPrompt.test.ts
git commit -m "feat: add music prompt compiler entry point"
```

---

## Task 7: Wire compiler into the generate route

**Files:**
- Modify: `lib/music.ts` (extend `GenerateRequest`)
- Modify: `app/api/music/generate/route.ts`

- [ ] **Step 1: Extend `GenerateRequest` in `lib/music.ts`**

Replace the existing `GenerateRequest` interface (around line 41) with:

```ts
import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

// Payload sent from the prompt box to POST /api/music/generate.
export interface GenerateRequest {
  prompt: string;
  lyrics?: string;
  style?: string;
  instrumental?: boolean;
  genre?: MusicGenre;
  moods?: MusicMood[];
  useCase?: MusicUseCase;
  vocalMode?: VocalMode;
  language?: string;
}
```

(Place the `import type` with the other imports at the top of `lib/music.ts`.)

- [ ] **Step 2: Import the compiler in the generate route**

In `app/api/music/generate/route.ts`, add to the imports:

```ts
import { compileMusicPrompt } from "@/lib/music-prompt";
```

- [ ] **Step 3: Parse new fields and compile**

In `POST`, after the existing parsing of `instrumental` (around line 45), add:

```ts
  const genre = typeof body.genre === "string" ? body.genre : undefined;
  const moods = Array.isArray(body.moods)
    ? (body.moods.filter((m) => typeof m === "string") as string[])
    : undefined;
  const useCase = typeof body.useCase === "string" ? body.useCase : undefined;
  const vocalMode = typeof body.vocalMode === "string" ? body.vocalMode : undefined;
  const language = typeof body.language === "string" ? body.language : undefined;

  const compiled = compileMusicPrompt({
    userDescription: [prompt, style].filter(Boolean).join(". "),
    genre: genre as never,
    moods: moods as never,
    useCase: useCase as never,
    vocalMode: (vocalMode as never) ?? (instrumental ? ("instrumental" as never) : undefined),
    language,
    lyrics: lyrics || undefined,
  });
```

Also widen the `body` type at the top of `POST` to include the new optional fields:

```ts
  let body: {
    prompt?: unknown;
    lyrics?: unknown;
    style?: unknown;
    instrumental?: unknown;
    genre?: unknown;
    moods?: unknown;
    useCase?: unknown;
    vocalMode?: unknown;
    language?: unknown;
  };
```

- [ ] **Step 4: Store compiled metadata and send compiled prompt**

Replace the `initialMetadata` object with:

```ts
  const initialMetadata = {
    instrumental: compiled.instrumental,
    ...(lyrics ? { lyrics } : {}),
    ...(style ? { style } : {}),
    ...compiled.metadata,
    ...(compiled.lyrics ? { lyrics_payload: compiled.lyrics } : {}),
  };
```

Replace the `replicate.predictions.create` input with the compiled values:

```ts
    const prediction = await replicate.predictions.create({
      model: MINIMAX_MODEL,
      input: buildMinimaxInput({
        prompt: compiled.prompt,
        lyrics: compiled.lyrics,
        instrumental: compiled.instrumental,
      }),
    });
```

(Keep `p_prompt: prompt` and `p_title: deriveTitle(prompt)` unchanged — the row's `prompt` stays the raw user text.)

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/music.ts app/api/music/generate/route.ts
git commit -m "feat: compile prompts server-side before MiniMax generation"
```

---

## Task 8: Structured option selects in the prompt box

**Files:**
- Modify: `components/prompt-box.tsx`

The existing Instrumental toggle is removed; a Vocal select carries the
`instrumental` option. Genre/Use-case are single-select; Mood is multi-select.
All default to unset (compiler infers).

- [ ] **Step 1: Add option constants and state**

Near the top of `prompt-box.tsx` (after the `cn` helper), add option lists:

```tsx
import type {
  GenerateRequest,
} from "@/lib/music";
import type {
  MusicGenre,
  MusicMood,
  MusicUseCase,
  VocalMode,
} from "@/lib/music-prompt/types";

const GENRE_OPTIONS: { value: MusicGenre; label: string }[] = [
  { value: "edm", label: "EDM" },
  { value: "reggaeton", label: "Reggaeton" },
  { value: "hiphop_trap", label: "Hip-hop / Trap" },
  { value: "techno", label: "Techno" },
  { value: "korean_ballad", label: "Korean Ballad" },
  { value: "brazilian_funk", label: "Brazilian Funk" },
  { value: "afropop_festival", label: "Afropop Festival" },
  { value: "french_maghreb_hiphop", label: "French Maghreb Hip-hop" },
  { value: "football_chant", label: "Football Chant" },
];

const MOOD_OPTIONS: { value: MusicMood; label: string }[] = [
  { value: "hard", label: "Hard" },
  { value: "energetic", label: "Energetic" },
  { value: "dark", label: "Dark" },
  { value: "happy", label: "Happy" },
  { value: "emotional", label: "Emotional" },
  { value: "sexy", label: "Sexy" },
  { value: "epic", label: "Epic" },
  { value: "funny", label: "Funny" },
  { value: "nostalgic", label: "Nostalgic" },
  { value: "romantic", label: "Romantic" },
  { value: "aggressive", label: "Aggressive" },
  { value: "festival", label: "Festival" },
];

const USE_CASE_OPTIONS: { value: MusicUseCase; label: string }[] = [
  { value: "workout", label: "Workout" },
  { value: "club", label: "Club" },
  { value: "party", label: "Party" },
  { value: "short_form", label: "Short-form" },
  { value: "gaming", label: "Gaming" },
  { value: "travel_vlog", label: "Travel Vlog" },
  { value: "sports_chant", label: "Sports Chant" },
  { value: "comedy_roast", label: "Comedy Roast" },
  { value: "background", label: "Background" },
  { value: "personal_song", label: "Personal Song" },
];

const VOCAL_OPTIONS: { value: VocalMode; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "instrumental", label: "Instrumental" },
  { value: "male_vocal", label: "Male vocal" },
  { value: "female_vocal", label: "Female vocal" },
  { value: "rap_vocal", label: "Rap vocal" },
  { value: "crowd_chant", label: "Crowd chant" },
];
```

Replace the `instrumental` state with the new structured state (keep `value`,
`lyrics`, `style`, `lyricsOpen`, `styleOpen`):

```tsx
    const [genre, setGenre] = React.useState<MusicGenre | "">("");
    const [moods, setMoods] = React.useState<MusicMood[]>([]);
    const [useCase, setUseCase] = React.useState<MusicUseCase | "">("");
    const [vocalMode, setVocalMode] = React.useState<VocalMode>("auto");
    const [optionsOpen, setOptionsOpen] = React.useState(false);
```

- [ ] **Step 2: Update `handleSubmit` to emit structured fields**

```tsx
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const text = value.trim();
      if (!text) return;
      onSend?.({
        prompt: text,
        lyrics: lyrics.trim() || undefined,
        style: style.trim() || undefined,
        instrumental: vocalMode === "instrumental",
        genre: genre || undefined,
        moods: moods.length ? moods : undefined,
        useCase: useCase || undefined,
        vocalMode,
        language: undefined,
      });
      setValue("");
      setLyrics("");
      setStyle("");
      setGenre("");
      setMoods([]);
      setUseCase("");
      setVocalMode("auto");
      setLyricsOpen(false);
      setStyleOpen(false);
      setOptionsOpen(false);
    };
```

- [ ] **Step 3: Replace the Instrumental toggle button with an Options toggle + panel**

Remove the existing Instrumental `<button>` (the one wrapping `InstrumentalIcon`).
In its place add an Options toggle button (reuse `InstrumentalIcon`):

```tsx
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            aria-pressed={optionsOpen}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm transition-colors focus-visible:outline-none",
              optionsOpen
                ? "dark:text-[#99ceff] text-[#2294ff] dark:bg-[#3b4045] bg-accent"
                : "text-foreground dark:text-white hover:bg-accent dark:hover:bg-[#515151]",
            )}
          >
            <InstrumentalIcon className="h-4 w-4" />
            Options
          </button>
```

Then add the options panel directly after the `{styleOpen && (...)}` block:

```tsx
        {optionsOpen && (
          <div className="mx-1 mb-1 grid grid-cols-1 gap-2 rounded-2xl bg-black/5 p-3 dark:bg-white/5 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Genre
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as MusicGenre | "")}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                <option value="">Auto</option>
                {GENRE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Vocal
              <select
                value={vocalMode}
                onChange={(e) => setVocalMode(e.target.value as VocalMode)}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                {VOCAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Use case
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value as MusicUseCase | "")}
                className="rounded-lg border-0 bg-white/70 p-2 text-sm text-foreground dark:bg-[#3a3a3a] dark:text-white focus:ring-0 focus-visible:outline-none"
              >
                <option value="">Auto</option>
                {USE_CASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground dark:text-gray-400">
              Mood
              <div className="flex flex-wrap gap-1">
                {MOOD_OPTIONS.map((o) => {
                  const active = moods.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setMoods((prev) =>
                          prev.includes(o.value)
                            ? prev.filter((m) => m !== o.value)
                            : [...prev, o.value],
                        )
                      }
                      className={cn(
                        "rounded-full px-2 py-1 text-xs transition-colors",
                        active
                          ? "bg-[#2294ff] text-white dark:bg-[#99ceff] dark:text-black"
                          : "bg-white/70 text-foreground dark:bg-[#3a3a3a] dark:text-white",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds, no lint errors. (If lint flags the now-unused
`instrumental` import path or state, ensure all references were removed.)

- [ ] **Step 5: Manual smoke (optional)**

Run: `npm run dev`, open http://localhost:3000 workspace, expand Options, pick
Genre=EDM, Mood=Hard, Vocal=Instrumental, submit a short prompt; confirm a track
starts processing without console errors.

- [ ] **Step 6: Commit**

```bash
git add components/prompt-box.tsx
git commit -m "feat: add structured music options to prompt box"
```

---

## Task 9: Documentation

**Files:**
- Create: `docs/MINIMAX_PROMPT_ENGINEERING.md`

- [ ] **Step 1: Write `docs/MINIMAX_PROMPT_ENGINEERING.md`**

Include these sections (prose, real content — no placeholders):

1. **Why normal users don't write final prompts** — product principle; users
   describe intent simply, the compiler produces the dense English prompt.
2. **The Music Prompt Compiler formula** — the 12-part formula and final shape,
   referencing `lib/music-prompt/buildMusicPrompt.ts`.
3. **MiniMax 2.6 prompt guidelines** — `prompt` describes style/mood/genre/
   instrumentation/tempo/vocal/arrangement/production; `lyrics` are sung; `is_instrumental`
   drops lyrics; limits `MAX_PROMPT_CHARS=2000`, `MAX_LYRICS_CHARS=3500`.
4. **Vocal vs instrumental** — booster strings; instrumental enforces "no vocals,
   no lyrics"; vocal enforces "rich full instrumental backing, no acapella".
5. **Genre/mood/use-case presets** — where they live (`presets.ts`), that they are
   verbatim style strings.
6. **Reference sanitization** — `REFERENCE_MAP` + risky-phrase stripping + always-appended
   copyright line; documented limitation (unknown artist names rely on the copyright backstop).
7. **Adding a new genre preset** — add to `MusicGenre` in `types.ts`, add the string to
   `GENRE_PRESETS` and `GENRE_OPTIONS`, optionally to the auto vocal-mode sets in `presets.ts`.
8. **Example inputs and final prompts** — the 4 task examples with their compiled output
   substrings (match the assertions in `buildMusicPrompt.test.ts`).

- [ ] **Step 2: Commit**

```bash
git add docs/MINIMAX_PROMPT_ENGINEERING.md
git commit -m "docs: document MiniMax prompt engineering compiler"
```

---

## Task 10: Final validation + project bookkeeping

**Files:**
- Modify: `PLAN.md`, `RESULT.md`, `RESULT_ARCHIVE.md`

- [ ] **Step 1: Full gate**

Run: `npm test && npm run build && npm run lint`
Expected: tests pass, build succeeds, lint clean.

- [ ] **Step 2: Move current RESULT.md into RESULT_ARCHIVE.md**

Prepend the current "Landing footer section" RESULT.md content to the top of
`RESULT_ARCHIVE.md`.

- [ ] **Step 3: Write new RESULT.md**

Background / Implementation / Verification Matrix / Lessons for the Music Prompt
Compiler. Verification matrix rows: `npm test`, `npm run build`, `npm run lint`,
and a manual generate smoke if performed.

- [ ] **Step 4: Update PLAN.md**

Add a `[Done] Music Prompt Compiler (2026-06-16) - ...` one-liner to `## Done`;
remove the oldest item if `## Done` exceeds 10.

- [ ] **Step 5: Commit**

```bash
git add PLAN.md RESULT.md RESULT_ARCHIVE.md
git commit -m "docs: record music prompt compiler result"
```

---

## Self-review notes

- **Spec coverage:** types/presets/sanitizer/lyrics/compiler/index (Tasks 2-6),
  server integration + metadata storage (Task 7), UI structured options + folded
  Instrumental toggle (Task 8), docs (Task 9), vitest (Task 1), final gate (Task 10).
  All spec sections covered.
- **Instrumental lyrics:** compiler returns `undefined` lyrics for instrumental,
  matching `buildMinimaxInput` which drops lyrics when `is_instrumental` is true.
- **Type consistency:** `compileMusicPrompt`, `buildMusicPrompt`, `resolveVocalMode`,
  `buildLyricsPayload(input, resolvedVocalMode)`, `sanitizeReferences(text)`,
  `CompiledPrompt`/`CompiledPromptMetadata`, `PROMPT_COMPILER_VERSION` used
  consistently across tasks.
- **No DB migration / no credit-logic change:** Task 7 keeps `create_music_with_credit`
  call shape and only augments metadata + swaps the Replicate input prompt.
