import { v } from "convex/values";

export const islandVisualThemeKeys = [
  "health",
  "relationships",
  "work",
  "learning",
] as const;

export type IslandVisualThemeKey = (typeof islandVisualThemeKeys)[number];

export const islandVisualThemeKeyValidator = v.union(
  v.literal("health"),
  v.literal("relationships"),
  v.literal("work"),
  v.literal("learning"),
);

export function isIslandVisualThemeKey(
  value: unknown,
): value is IslandVisualThemeKey {
  return islandVisualThemeKeys.includes(value as IslandVisualThemeKey);
}
export function fallbackVisualThemeKey(topic: string): IslandVisualThemeKey {
  const normalized = topic.toLocaleLowerCase();

  if (/friend|family|relationship|community|social|partner/.test(normalized)) {
    return "relationships";
  }
  if (/work|career|business|money|finance|project/.test(normalized)) {
    return "work";
  }
  if (/learn|study|read|school|creative|music|guitar|skill/.test(normalized)) {
    return "learning";
  }
  return "health";
}
