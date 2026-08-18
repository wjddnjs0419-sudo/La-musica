import type { MusicMood, ReggaetonScene, ReggaetonStyle } from "./types";

export type ReggaetonSimplePreset = "club_heat" | "after_midnight" | "dangerous_love" | "summer_nights";
export const REGGAETON_STYLE_GUIDANCE: Record<ReggaetonStyle, string> = {
  old_school: "raw, classic dembow", reggaeton_pop: "polished and catchy", perreo: "heavy, club-ready perreo groove", romantic: "smooth and sensual reggaeton", trapeton: "dark 808s with trap influence", neoperreo: "experimental, futuristic reggaeton",
};
export const REGGAETON_SCENE_GUIDANCE: Record<ReggaetonScene, string> = {
  club: "dancefloor-ready club energy", late_night: "intimate late-night atmosphere", beach: "warm beach-night release", party: "high-energy party lift",
};
export const REGGAETON_SIMPLE_PRESETS: Record<ReggaetonSimplePreset, { style: ReggaetonStyle; moods: MusicMood[]; scene: ReggaetonScene }> = {
  club_heat: { style: "perreo", moods: ["sexy"], scene: "club" }, after_midnight: { style: "trapeton", moods: ["dark"], scene: "late_night" }, dangerous_love: { style: "romantic", moods: ["dark"], scene: "late_night" }, summer_nights: { style: "reggaeton_pop", moods: ["energetic"], scene: "beach" },
};
export function isReggaetonStyle(value: unknown): value is ReggaetonStyle { return typeof value === "string" && value in REGGAETON_STYLE_GUIDANCE; }
export function isReggaetonScene(value: unknown): value is ReggaetonScene { return typeof value === "string" && value in REGGAETON_SCENE_GUIDANCE; }
export function resolveReggaetonLanguage(language: string | undefined, hasUserLyrics: boolean) { return language?.trim() || (hasUserLyrics ? undefined : "Spanish"); }
export function getMatchingReggaetonSimplePreset(style: ReggaetonStyle | "", moods: MusicMood[], scene: ReggaetonScene | ""): ReggaetonSimplePreset | "" { return (Object.entries(REGGAETON_SIMPLE_PRESETS) as [ReggaetonSimplePreset, typeof REGGAETON_SIMPLE_PRESETS[ReggaetonSimplePreset]][]).find(([, value]) => value.style === style && value.scene === scene && value.moods.length === moods.length && value.moods.every((mood) => moods.includes(mood)))?.[0] ?? ""; }
