import { describe, it, expect } from "vitest";
import { buildCostLogRow, GEMINI_FLASH_LITE_COST_PER_CALL_USD } from "./cost-logging";

describe("buildCostLogRow", () => {
  it("includes music model and duration in row", () => {
    const row = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "user",
    });

    expect(row.music_model).toBe("fishaudio/ace-step-1.5");
    expect(row.duration_seconds).toBe(180);
    expect(row.user_id).toBe("user-1");
    expect(row.music_id).toBe("music-1");
    expect(row.prediction_id).toBe("pred-1");
  });

  it("estimates music cost from duration and per-second rate", () => {
    const row = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "user",
    });

    expect(row.estimated_music_cost_usd).toBeCloseTo(
      0.03204,
      6,
    );
  });

  it("adds Gemini cost for translation call", () => {
    const row = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "user",
      translationUsed: true,
    });

    expect(row.translation_used).toBe(true);
    expect(row.estimated_gemini_cost_usd).toBeGreaterThan(0);
  });

  it("adds Gemini cost for auto lyrics generation", () => {
    const rowWithAutoLyrics = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "auto",
    });

    const rowWithUserLyrics = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "user",
    });

    expect(rowWithAutoLyrics.lyrics_generation_used).toBe(true);
    expect(rowWithAutoLyrics.estimated_gemini_cost_usd ?? 0).toBeGreaterThan(
      rowWithUserLyrics.estimated_gemini_cost_usd ?? 0,
    );
  });

  it("total cost equals sum of music + gemini costs", () => {
    const row = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 180,
      estimatedMusicCostUsd: 0.03204,
      lyricsSource: "auto",
      translationUsed: true,
      styleRefineUsed: true,
    });

    const expected =
      (row.estimated_music_cost_usd ?? 0) + (row.estimated_gemini_cost_usd ?? 0);
    expect(row.estimated_total_cost_usd).toBeCloseTo(expected, 6);
  });

  it("flags each used AI step", () => {
    const row = buildCostLogRow({
      userId: "user-1",
      musicId: "music-1",
      generationJobId: "pred-1",
      musicModel: "fishaudio/ace-step-1.5",
      durationSeconds: 60,
      estimatedMusicCostUsd: 0.01068,
      lyricsSource: "instrumental",
      translationUsed: true,
      styleRefineUsed: true,
    });

    expect(row.translation_used).toBe(true);
    expect(row.style_refine_used).toBe(true);
    expect(row.lyrics_generation_used).toBe(false);
  });

  it("exports a positive Gemini cost constant", () => {
    expect(GEMINI_FLASH_LITE_COST_PER_CALL_USD).toBeGreaterThan(0);
  });
});
