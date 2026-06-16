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
    expect(r.prompt).toMatch(/^prioritize this musical idea: 헬스장에서 들을 하드한 EDM/);
    expect(r.prompt).toContain("sidechained kick");
    expect(r.prompt).toContain("festival main-stage");
    expect(r.prompt).toContain("steady motivational drive");
    expect(r.prompt).toContain("no vocals, no lyrics");
    expect(r.prompt).toContain("loud radio-ready electronic mix");
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
    expect(r.prompt).toContain("modern Medellin-style commercial reggaeton");
    expect(r.prompt).toContain("groove-first dembow pocket");
    expect(r.prompt).toContain("syncopated shaker");
    expect(r.prompt).toContain("rolling sub and 808 bass");
    expect(r.prompt).toContain("forward motion");
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
    expect(r.prompt).toContain("Korean drama OST ballad");
    expect(r.prompt).toContain("string orchestra");
    expect(r.prompt).toContain("rich full instrumental backing");
    expect(r.prompt).toContain("no acapella sections");
    expect(r.prompt).toContain("sung in Korean");
    expect(r.prompt).toContain(COPYRIGHT);
    expect(r.lyrics).toContain("[Verse]");
    expect(r.metadata.language).toBe("Korean");
  });

  it("keeps genre guidance from forcing instrumental mode on vocal songs", () => {
    const r = compileMusicPrompt({
      userDescription: "romantic reggaeton hook",
      genre: "reggaeton",
      vocalMode: "female_vocal",
      lyrics: "[Verse]\nslow night",
    });
    expect(r.instrumental).toBe(false);
    expect(r.prompt).toContain("groove-first dembow pocket");
    expect(r.prompt).toContain("expressive female vocal");
    expect(r.prompt).not.toContain("Instrumental Latin");
    expect(r.prompt).not.toContain("fully instrumental");
    expect(r.lyrics).toContain("[Verse]");
  });

  it("keeps lyrics optional but guides lyricless vocal songs", () => {
    const r = compileMusicPrompt({
      userDescription: "upbeat birthday song for Mina",
      vocalMode: "female_vocal",
    });
    expect(r.instrumental).toBe(false);
    expect(r.lyrics).toBeUndefined();
    expect(r.prompt).toContain("expressive female vocal");
    expect(r.prompt).toContain("generate original simple singable lyrics");
  });

  it("limits mood guidance so selected chips do not overwhelm the prompt", () => {
    const r = compileMusicPrompt({
      userDescription: "fast club track",
      genre: "techno",
      moods: ["hard", "energetic", "dark", "epic"],
      vocalMode: "instrumental",
    });
    expect(r.prompt).toContain("harder transients");
    expect(r.prompt).toContain("driving pulse");
    expect(r.prompt).not.toContain("minor-key color");
    expect(r.prompt).not.toContain("cinematic rise");
  });

  it("does not inject a language cue for instrumental songs", () => {
    const r = compileMusicPrompt({
      userDescription: "비 오는 밤 한국 발라드 연주곡",
      genre: "korean_ballad",
      moods: ["emotional"],
      vocalMode: "instrumental",
      language: "Korean",
    });
    expect(r.instrumental).toBe(true);
    expect(r.prompt).not.toContain("sung in");
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
    expect(r.prompt).toContain("Latin urban");
    expect(r.prompt).toContain("808 bass");
    expect(r.prompt).toContain(COPYRIGHT);
  });

  it("keeps the copyright line intact even when the body exceeds the limit", () => {
    const r = compileMusicPrompt({
      userDescription: "x".repeat(2500),
      genre: "edm",
      moods: ["hard"],
      vocalMode: "instrumental",
    });
    expect(r.prompt.length).toBeLessThanOrEqual(2000);
    expect(r.prompt).toContain(COPYRIGHT);
  });

  it("strips bogus union values out of persisted metadata", () => {
    const r = compileMusicPrompt({
      userDescription: "x",
      genre: "notgenre" as never,
      moods: ["hard", "bogus" as never],
      useCase: "nope" as never,
    });
    expect(r.metadata.genre).toBeUndefined();
    expect(r.metadata.use_case).toBeUndefined();
    expect(r.metadata.moods).toEqual(["hard"]);
    expect(r.prompt).not.toContain("undefined");
  });

  it("does not repeat a shared descriptor segment (deep 808 bass)", () => {
    const r = compileMusicPrompt({
      userDescription: "빠른 레게톤",
      referenceText: "Bad Bunny",
      genre: "reggaeton",
      vocalMode: "instrumental",
    });
    const count = (r.prompt.toLowerCase().match(/deep 808 bass/g) ?? []).length;
    expect(count).toBe(1);
  });
});
