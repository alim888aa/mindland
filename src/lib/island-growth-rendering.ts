import {
  isIslandDetailKey,
  isIslandMilestoneDetailKey,
  type IslandDetailKey,
  type IslandMilestoneDetailKey,
} from "../domain/island-visual-details.ts";
import { LAND_GROWTH_POINT_CAP } from "../domain/island-growth.ts";

export type StoredIslandGrowth = {
  islandId: string;
  lifetimePositivePoints: number;
  lifetimeNegativePoints: number;
  rockCount: number;
  growthStepCount: number;
  isSunk: boolean;
  smallDetailKeys: readonly IslandDetailKey[];
  milestoneDetailKeys: readonly IslandMilestoneDetailKey[];
  updatedAt: number;
};

export type IslandGrowthVisualState = Omit<StoredIslandGrowth, "islandId">;

export const EMPTY_ISLAND_GROWTH: IslandGrowthVisualState = {
  lifetimePositivePoints: 0,
  lifetimeNegativePoints: 0,
  rockCount: 0,
  growthStepCount: 0,
  isSunk: false,
  smallDetailKeys: [],
  milestoneDetailKeys: [],
  updatedAt: 0,
};

export const MAX_RENDERED_SMALL_DETAILS = 24;
export const MAX_RENDERED_MILESTONE_DETAILS = 2;
export const MAX_RENDERED_ROCKS = 8;

export type IslandRenderBudget = {
  smallDetails: number;
  milestoneDetails: number;
  rocks: number;
};

type IslandRenderRequest = {
  id: string;
  smallDetails: number;
  milestoneDetails: number;
  rocks: number;
};

const nonNegativeInteger = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

export const normalizeStoredIslandGrowth = (
  value: StoredIslandGrowth | undefined,
): IslandGrowthVisualState => {
  if (value === undefined) return EMPTY_ISLAND_GROWTH;

  return {
    lifetimePositivePoints: nonNegativeInteger(value.lifetimePositivePoints),
    lifetimeNegativePoints: nonNegativeInteger(value.lifetimeNegativePoints),
    rockCount: nonNegativeInteger(value.rockCount),
    growthStepCount: nonNegativeInteger(value.growthStepCount),
    isSunk: value.isSunk,
    smallDetailKeys: value.smallDetailKeys.filter(isIslandDetailKey),
    milestoneDetailKeys: value.milestoneDetailKeys.filter(
      isIslandMilestoneDetailKey,
    ),
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  };
};

export const calculateIslandLandScale = (value: {
  growthStepCount: number;
  startingLandScale: number;
  maximumLandScale: number;
  growthStepsToMaximum: number | null;
}) => {
  const minimum = Math.min(value.startingLandScale, value.maximumLandScale);
  const maximum = Math.max(value.startingLandScale, value.maximumLandScale);
  if (
    value.growthStepsToMaximum === null ||
    !Number.isFinite(value.growthStepsToMaximum) ||
    value.growthStepsToMaximum < 1
  ) {
    return minimum;
  }

  const stepsToMaximum = Math.max(1, Math.trunc(value.growthStepsToMaximum));
  const progress = Math.min(
    1,
    nonNegativeInteger(value.growthStepCount) / stepsToMaximum,
  );
  return minimum + (maximum - minimum) * progress;
};

export const growthVisualKey = (value: IslandGrowthVisualState) =>
  [
    value.lifetimePositivePoints,
    value.lifetimeNegativePoints,
    value.rockCount,
    value.growthStepCount,
    value.isSunk ? 1 : 0,
    value.smallDetailKeys.join(","),
    value.milestoneDetailKeys.join(","),
  ].join(":");

export const earnedPropCount = (lifetimePositivePoints: number) =>
  Math.max(
    0,
    nonNegativeInteger(lifetimePositivePoints) - LAND_GROWTH_POINT_CAP,
  );

export const createWorldRenderBudgets = (
  requests: readonly IslandRenderRequest[],
): Readonly<Record<string, IslandRenderBudget>> =>
  Object.fromEntries(
    requests.map((request) => [
      request.id,
      {
        smallDetails: Math.min(
          nonNegativeInteger(request.smallDetails),
          MAX_RENDERED_SMALL_DETAILS,
        ),
        milestoneDetails: Math.min(
          nonNegativeInteger(request.milestoneDetails),
          MAX_RENDERED_MILESTONE_DETAILS,
        ),
        rocks: Math.min(
          nonNegativeInteger(request.rocks),
          MAX_RENDERED_ROCKS,
        ),
      },
    ]),
  );
