import { isReggaetonScene, isReggaetonStyle, resolveReggaetonLanguage } from "./reggaeton";

export function resolveReggaetonGenerationInput(input: { style?: unknown; scene?: unknown; language?: unknown; lyrics?: string }) {
  const language = typeof input.language === "string" ? input.language.trim() : "";
  return { genre: "reggaeton" as const, style: isReggaetonStyle(input.style) ? input.style : undefined, scene: isReggaetonScene(input.scene) ? input.scene : undefined, language: resolveReggaetonLanguage(language || undefined, Boolean(input.lyrics?.trim())) };
}
