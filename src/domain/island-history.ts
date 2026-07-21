export type StoredIslandCondition = "aboveWater" | "sunk";
export const islandHistoryPageLimit = 30;

export function islandHistoryPageSize(requested: number) {
  if (!Number.isFinite(requested)) return islandHistoryPageLimit;
  return Math.max(
    1,
    Math.min(islandHistoryPageLimit, Math.floor(requested)),
  );
}

export function isOwnedHistoryResource<
  Resource extends { ownerTokenIdentifier: string },
>(
  resource: Resource | null,
  ownerTokenIdentifier: string,
): resource is Resource {
  return (
    resource !== null &&
    resource.ownerTokenIdentifier === ownerTokenIdentifier
  );
}

export function conditionFromStoredGrowth(
  growth: { isSunk: boolean } | null,
): StoredIslandCondition {
  return growth?.isSunk === true ? "sunk" : "aboveWater";
}

export function effectForIsland<IslandId extends string>(
  effects: ReadonlyArray<{
    islandId: IslandId;
    effect: "supportive" | "harmful" | "both";
    positiveDetailKey?: string;
  }>,
  islandId: IslandId,
) {
  return effects.find((effect) => effect.islandId === islandId) ?? null;
}

export function exactOriginalEntries(
  activities: ReadonlyArray<{
    structuredSubmissionId?: string;
    originalEntries: ReadonlyArray<{ messageId: string; text: string }>;
  }>,
) {
  const seen = new Set<string>();
  const entries: Array<{
    messageId: string;
    text: string;
    sourceKind: "conversation" | "structuredQuestionnaire";
    structuredSubmissionId: string | null;
  }> = [];

  for (const activity of activities) {
    for (const entry of activity.originalEntries) {
      const structuredSubmissionId = activity.structuredSubmissionId ?? null;
      const key = `${structuredSubmissionId ?? "conversation"}\u0000${entry.messageId}\u0000${entry.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        messageId: entry.messageId,
        text: entry.text,
        sourceKind:
          structuredSubmissionId === null
            ? "conversation"
            : "structuredQuestionnaire",
        structuredSubmissionId,
      });
    }
  }

  return entries;
}
