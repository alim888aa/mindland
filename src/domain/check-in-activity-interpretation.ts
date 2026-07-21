import {
  isIslandDetailKey,
  type IslandDetailKey,
} from "./island-visual-details.ts";

export const activityEffects = ["supportive", "harmful", "both"] as const;
export type ActivityEffect = (typeof activityEffects)[number];

export const activitySentiments = [
  "positive",
  "neutral",
  "negative",
  "mixed",
] as const;
export type ActivitySentiment = (typeof activitySentiments)[number];

export type InterpretedCheckInActivity = {
  activity: string;
  durationMinutes: number | null;
  time: string | null;
  sentiment: ActivitySentiment;
  tags: string[];
  sourceMessageIds: string[];
  islandEffects: Array<{
    islandId: string;
    effect: ActivityEffect;
    positiveDetailKey: IslandDetailKey | null;
  }>;
};

export type CheckInActivityInterpretation = {
  activities: InterpretedCheckInActivity[];
};

export function prepareActivityApplicationInput(
  activity: InterpretedCheckInActivity,
  exactSourceText: ReadonlyMap<string, string>,
) {
  return {
    activity: activity.activity,
    durationMinutes: activity.durationMinutes,
    time: activity.time,
    sentiment: activity.sentiment,
    tags: activity.tags,
    islandEffects: activity.islandEffects,
    originalEntries: activity.sourceMessageIds.map((messageId) => ({
      messageId,
      text: exactSourceText.get(messageId)!,
    })),
  };
}

function invalid(message: string) {
  return { success: false as const, error: new Error(message) };
}

export function parseCheckInActivityInterpretation(
  value: unknown,
  options: {
    ownedIslandIds: ReadonlySet<string>;
    userMessageIds: ReadonlySet<string>;
  },
) {
  if (typeof value !== "object" || value === null) {
    return invalid("Expected an interpretation object.");
  }

  const activities = (value as Record<string, unknown>).activities;
  if (!Array.isArray(activities) || activities.length > 20) {
    return invalid("The activity list was invalid.");
  }

  const parsed: InterpretedCheckInActivity[] = [];
  for (const candidate of activities) {
    if (typeof candidate !== "object" || candidate === null) {
      return invalid("An activity was invalid.");
    }
    const activity = candidate as Record<string, unknown>;
    const durationMinutes = activity.durationMinutes;
    const time = activity.time;
    const sentiment = activity.sentiment;
    const tags = activity.tags;
    const sourceMessageIds = activity.sourceMessageIds;
    const islandEffects = activity.islandEffects;

    if (
      typeof activity.activity !== "string" ||
      activity.activity.trim().length === 0 ||
      activity.activity.length > 240 ||
      !(
        durationMinutes === null ||
        (typeof durationMinutes === "number" &&
          Number.isFinite(durationMinutes) &&
          durationMinutes >= 0 &&
          durationMinutes <= 1_440)
      ) ||
      !(time === null || (typeof time === "string" && time.length <= 40)) ||
      !activitySentiments.includes(sentiment as ActivitySentiment) ||
      !Array.isArray(tags) ||
      tags.length > 10 ||
      tags.some(
        (tag) =>
          typeof tag !== "string" ||
          tag.trim().length === 0 ||
          tag.length > 40,
      ) ||
      !Array.isArray(sourceMessageIds) ||
      sourceMessageIds.length === 0 ||
      sourceMessageIds.length > 12 ||
      sourceMessageIds.some(
        (messageId) =>
          typeof messageId !== "string" ||
          !options.userMessageIds.has(messageId),
      ) ||
      !Array.isArray(islandEffects) ||
      islandEffects.length === 0 ||
      islandEffects.length > 8
    ) {
      return invalid("An activity field was invalid.");
    }

    const parsedEffects: InterpretedCheckInActivity["islandEffects"] = [];
    const seenIslandIds = new Set<string>();
    for (const candidateEffect of islandEffects) {
      if (typeof candidateEffect !== "object" || candidateEffect === null) {
        return invalid("An island effect was invalid.");
      }
      const effect = candidateEffect as Record<string, unknown>;
      if (
        typeof effect.islandId !== "string" ||
        !options.ownedIslandIds.has(effect.islandId) ||
        seenIslandIds.has(effect.islandId) ||
        !activityEffects.includes(effect.effect as ActivityEffect) ||
        !(
          effect.positiveDetailKey === null ||
          isIslandDetailKey(effect.positiveDetailKey)
        ) ||
        ((effect.effect === "supportive" || effect.effect === "both") &&
          effect.positiveDetailKey === null) ||
        (effect.effect === "harmful" && effect.positiveDetailKey !== null)
      ) {
        return invalid("An island effect field was invalid.");
      }
      seenIslandIds.add(effect.islandId);
      parsedEffects.push({
        islandId: effect.islandId,
        effect: effect.effect as ActivityEffect,
        positiveDetailKey: effect.positiveDetailKey as IslandDetailKey | null,
      });
    }

    parsed.push({
      activity: activity.activity.trim(),
      durationMinutes: durationMinutes as number | null,
      time: time === null ? null : (time as string).trim(),
      sentiment: sentiment as ActivitySentiment,
      tags: [...new Set((tags as string[]).map((tag) => tag.trim()))],
      sourceMessageIds: [
        ...new Set(sourceMessageIds as string[]),
      ],
      islandEffects: parsedEffects,
    });
  }

  return {
    success: true as const,
    value: { activities: parsed } satisfies CheckInActivityInterpretation,
  };
}
