import type { Id } from "./_generated/dataModel";
import type { IslandVisualThemeKey } from "./islandCatalogue";

export type MaterializedIslandInput = {
  islandKey: string;
  name: string;
  purpose: string;
  sourceContext: string;
  visualThemeKey: IslandVisualThemeKey;
  visualSeed: number;
};

function hashText(text: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function materializeIslandInputs(
  interviewId: Id<"onboardingInterviews">,
  candidates: ReadonlyArray<{
    name: string;
    purpose: string;
    sourceContext: string;
    visualThemeKey: IslandVisualThemeKey;
  }>,
): MaterializedIslandInput[] {
  return candidates.map((candidate, index) => {
    const islandKey = `${interviewId}:${index}`;
    return {
      islandKey,
      name: candidate.name.trim(),
      purpose: candidate.purpose.trim(),
      sourceContext: candidate.sourceContext.trim(),
      visualThemeKey: candidate.visualThemeKey,
      visualSeed: hashText(islandKey),
    };
  });
}

export function missingMaterializedIslandInputs(
  expected: readonly MaterializedIslandInput[],
  existingIslandKeys: ReadonlySet<string>,
) {
  return expected.filter((island) => !existingIslandKeys.has(island.islandKey));
}
