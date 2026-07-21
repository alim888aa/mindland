import type {
  IslandDetailKey,
  IslandMilestoneDetailKey,
} from "./island-visual-details.ts";

export const LAND_GROWTH_POINT_CAP = 5;
export const DAILY_POSITIVE_POINT_CAP = 12;

export type IslandGrowthState = {
  lifetimePositivePoints: number;
  lifetimeNegativePoints: number;
  rockCount: number;
  growthStepCount: number;
  isSunk: boolean;
  smallDetailKeys: IslandDetailKey[];
  milestoneDetailKeys: IslandMilestoneDetailKey[];
};

export type DailyIslandSummary = {
  hasPositiveNode: boolean;
  positivePointCount?: number;
  hasNegativePoint: boolean;
  summary: string;
  activityKeys: string[];
  positiveDetailKey?: IslandDetailKey;
};

export type DailyIslandSignal = {
  hasPositiveActivity: boolean;
  positiveActivityCount?: number;
  hasHarmfulActivity: boolean;
  summary: string;
  activityKeys: string[];
  positiveDetailKey?: IslandDetailKey;
};

export const emptyIslandGrowthState: IslandGrowthState = {
  lifetimePositivePoints: 0,
  lifetimeNegativePoints: 0,
  rockCount: 0,
  growthStepCount: 0,
  isSunk: false,
  smallDetailKeys: [],
  milestoneDetailKeys: [],
};

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function mergeSummary(previous: string | undefined, incoming: string) {
  const cleanIncoming = incoming.trim();
  const cleanPrevious = previous?.trim() ?? "";

  if (cleanPrevious.length === 0) return cleanIncoming;
  if (cleanIncoming.length === 0 || cleanPrevious === cleanIncoming) {
    return cleanPrevious;
  }
  return `${cleanPrevious} ${cleanIncoming}`;
}

export function deriveIslandCondition(
  lifetimePositivePoints: number,
  lifetimeNegativePoints: number,
) {
  const rockCount = Math.floor(lifetimeNegativePoints / 5);
  return {
    rockCount,
    growthStepCount: Math.min(
      LAND_GROWTH_POINT_CAP,
      Math.max(0, Math.trunc(lifetimePositivePoints)),
    ),
    isSunk: rockCount > 0 && rockCount >= lifetimePositivePoints,
  };
}

export function applyDailyIslandSignal(
  previousState: IslandGrowthState,
  previousDailySummary: DailyIslandSummary | null,
  signal: DailyIslandSignal,
) {
  const previousPositivePointCount =
    previousDailySummary?.positivePointCount ??
    (previousDailySummary?.hasPositiveNode ? 1 : 0);
  const requestedPositivePoints = signal.hasPositiveActivity
    ? Math.max(1, Math.trunc(signal.positiveActivityCount ?? 1))
    : 0;
  const gainedPositivePoints = Math.min(
    requestedPositivePoints,
    Math.max(0, DAILY_POSITIVE_POINT_CAP - previousPositivePointCount),
  );
  const gainsNegativePoint =
    signal.hasHarmfulActivity && !previousDailySummary?.hasNegativePoint;
  const lifetimePositivePoints =
    previousState.lifetimePositivePoints + gainedPositivePoints;
  const lifetimeNegativePoints =
    previousState.lifetimeNegativePoints + (gainsNegativePoint ? 1 : 0);
  const condition = deriveIslandCondition(
    lifetimePositivePoints,
    lifetimeNegativePoints,
  );
  const hasPositiveNode =
    previousDailySummary?.hasPositiveNode === true || signal.hasPositiveActivity;
  const positiveDetailKey =
    previousDailySummary?.positiveDetailKey ??
    (hasPositiveNode ? signal.positiveDetailKey : undefined);
  const previousPropThreshold = Math.max(
    LAND_GROWTH_POINT_CAP,
    previousState.lifetimePositivePoints,
  );
  const gainedPropCount = Math.max(
    0,
    lifetimePositivePoints - previousPropThreshold,
  );
  const smallDetailKeys =
    gainedPropCount > 0 && positiveDetailKey !== undefined
      ? [
          ...previousState.smallDetailKeys,
          ...Array.from({ length: gainedPropCount }, () => positiveDetailKey),
        ]
      : [...previousState.smallDetailKeys];
  const milestoneDetailKeys = [...previousState.milestoneDetailKeys];

  return {
    state: {
      lifetimePositivePoints,
      lifetimeNegativePoints,
      ...condition,
      smallDetailKeys,
      milestoneDetailKeys,
    } satisfies IslandGrowthState,
    dailySummary: {
      hasPositiveNode,
      positivePointCount: previousPositivePointCount + gainedPositivePoints,
      hasNegativePoint:
        previousDailySummary?.hasNegativePoint === true ||
        signal.hasHarmfulActivity,
      summary: mergeSummary(previousDailySummary?.summary, signal.summary),
      activityKeys: unique([
        ...(previousDailySummary?.activityKeys ?? []),
        ...signal.activityKeys,
      ]),
      positiveDetailKey,
    } satisfies DailyIslandSummary,
    delta: {
      positivePoints: gainedPositivePoints,
      negativePoints: gainsNegativePoint ? 1 : 0,
      rocks: condition.rockCount - previousState.rockCount,
      growthSteps: condition.growthStepCount - previousState.growthStepCount,
      sank: !previousState.isSunk && condition.isSunk,
      resurfaced: previousState.isSunk && !condition.isSunk,
    },
  };
}
