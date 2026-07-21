export const islandDetailKeys = [
  "sapling",
  "flowerPatch",
  "gardenBed",
  "trailMarker",
  "restBench",
  "bookStack",
  "practiceMarker",
  "warmLantern",
] as const;

export type IslandDetailKey = (typeof islandDetailKeys)[number];

export const islandMilestoneDetailKeys = [
  "grove",
  "hill",
  "windingPath",
  "smallShelter",
  "lookout",
] as const;

export type IslandMilestoneDetailKey =
  (typeof islandMilestoneDetailKeys)[number];

export function isIslandDetailKey(value: unknown): value is IslandDetailKey {
  return islandDetailKeys.includes(value as IslandDetailKey);
}

export function isIslandMilestoneDetailKey(
  value: unknown,
): value is IslandMilestoneDetailKey {
  return islandMilestoneDetailKeys.includes(
    value as IslandMilestoneDetailKey,
  );
}

export function milestoneDetailForStep(
  visualSeed: number,
  growthStepCount: number,
): IslandMilestoneDetailKey {
  if (growthStepCount < 1) {
    throw new Error("A milestone detail needs a completed growth step.");
  }

  const seed = Math.abs(Math.trunc(visualSeed));
  const index =
    (seed + growthStepCount - 1) % islandMilestoneDetailKeys.length;
  return islandMilestoneDetailKeys[index];
}
