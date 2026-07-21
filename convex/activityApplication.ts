import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";
import { isCurrentLocalDate } from "./checkInPolicy";
import { islandDetailKeyValidator } from "./islandVisualDetails";
import {
  applyDailyIslandSignal,
  emptyIslandGrowthState,
  type IslandGrowthState,
} from "../src/domain/island-growth";
import {
  conversationInterpretationOrNull,
  conversationInterpretationSourceKey,
} from "../src/domain/check-in-interpretation-policy";
import { structuredClaimFailureMessage } from "../src/domain/structured-check-in-policy";

const interpretationRetryLimit = 3;
const staleInterpretationThresholdMs = 3 * 60 * 1_000;

const activityEffectValidator = v.union(
  v.literal("supportive"),
  v.literal("harmful"),
  v.literal("both"),
);

const sentimentValidator = v.union(
  v.literal("positive"),
  v.literal("neutral"),
  v.literal("negative"),
  v.literal("mixed"),
);

const activityInputValidator = v.object({
  activity: v.string(),
  durationMinutes: v.union(v.number(), v.null()),
  time: v.union(v.string(), v.null()),
  sentiment: sentimentValidator,
  tags: v.array(v.string()),
  originalEntries: v.array(
    v.object({ messageId: v.string(), text: v.string() }),
  ),
  islandEffects: v.array(
    v.object({
      islandId: v.id("islands"),
      effect: activityEffectValidator,
      positiveDetailKey: v.union(islandDetailKeyValidator, v.null()),
    }),
  ),
});

function emptyGrowthState(): IslandGrowthState {
  return {
    ...emptyIslandGrowthState,
    smallDetailKeys: [],
    milestoneDetailKeys: [],
  };
}

async function scheduleExpiry(
  ctx: MutationCtx,
  interpretationId: Id<"checkInInterpretations">,
  attempt: number,
) {
  await ctx.scheduler.runAfter(
    staleInterpretationThresholdMs,
    internal.activityApplication.expireInterpretation,
    { interpretationId, attempt },
  );
}

export const claimInterpretation = internalMutation({
  args: { checkInId: v.id("dailyCheckIns") },
  returns: v.union(
    v.object({
      interpretationId: v.id("checkInInterpretations"),
      attempt: v.number(),
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      localDate: v.string(),
      timeZone: v.string(),
      consumedMessageIds: v.array(v.string()),
      islands: v.array(
        v.object({
          id: v.id("islands"),
          name: v.string(),
          purpose: v.string(),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const checkIn = await ctx.db.get(args.checkInId);
    if (checkIn === null || checkIn.status !== "complete") {
      return null;
    }

    if (checkIn.completedAt === undefined) {
      return null;
    }

    const sourceKey = conversationInterpretationSourceKey(
      checkIn._id,
      checkIn.completedAt,
    );
    const existing = await ctx.db
      .query("checkInInterpretations")
      .withIndex("by_owner_source", (index) =>
        index
          .eq("ownerTokenIdentifier", checkIn.ownerTokenIdentifier)
          .eq("sourceKey", sourceKey),
      )
      .unique();
    const now = Date.now();

    if (
      existing !== null &&
      (existing.status === "applied" ||
        existing.status === "interpreting" ||
        existing.attempts >= interpretationRetryLimit)
    ) {
      return null;
    }

    const attempt = (existing?.attempts ?? 0) + 1;
    const interpretationId =
      existing?._id ??
      (await ctx.db.insert("checkInInterpretations", {
        ownerTokenIdentifier: checkIn.ownerTokenIdentifier,
        checkInId: checkIn._id,
        threadId: checkIn.threadId,
        localDate: checkIn.localDate,
        timeZone: checkIn.timeZone,
        sourceKind: "conversation",
        sourceKey,
        status: "queued",
        attempts: 0,
        activityIds: [],
        createdAt: now,
        updatedAt: now,
      }));
    await ctx.db.patch(interpretationId, {
      status: "interpreting",
      attempts: attempt,
      errorMessage: undefined,
      updatedAt: now,
    });
    await scheduleExpiry(ctx, interpretationId, attempt);

    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", checkIn.ownerTokenIdentifier),
      )
      .order("asc")
      .collect();
    const priorConversationActivities = await ctx.db
      .query("activities")
      .withIndex("by_check_in", (index) => index.eq("checkInId", checkIn._id))
      .collect();
    const consumedMessageIds = [
      ...new Set(
        priorConversationActivities
          .filter((activity) => activity.structuredSubmissionId === undefined)
          .flatMap((activity) =>
            activity.originalEntries.map((entry) => entry.messageId),
          ),
      ),
    ];

    return {
      interpretationId,
      attempt,
      ownerTokenIdentifier: checkIn.ownerTokenIdentifier,
      threadId: checkIn.threadId,
      localDate: checkIn.localDate,
      timeZone: checkIn.timeZone,
      consumedMessageIds,
      islands: islands.map((island) => ({
        id: island._id,
        name: island.name,
        purpose: island.purpose,
      })),
    };
  },
});

export const claimStructuredInterpretation = internalMutation({
  args: { submissionId: v.id("structuredCheckInSubmissions") },
  returns: v.union(
    v.object({
      interpretationId: v.id("checkInInterpretations"),
      attempt: v.number(),
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      selectedIslandId: v.id("islands"),
      islands: v.array(
        v.object({
          id: v.id("islands"),
          name: v.string(),
          purpose: v.string(),
        }),
      ),
      answers: v.array(
        v.object({
          questionId: v.string(),
          question: v.string(),
          answer: v.union(v.string(), v.null()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (
      submission === null ||
      (submission.status !== "queued" && submission.status !== "failed")
    ) {
      return null;
    }
    const checkIn = await ctx.db.get(submission.checkInId);
    const selectedIsland = await ctx.db.get(submission.islandId);
    const sourceFailureMessage = structuredClaimFailureMessage({
      checkInExists: checkIn !== null,
      islandExists: selectedIsland !== null,
      checkInOwnedBySubmission:
        checkIn?.ownerTokenIdentifier === submission.ownerTokenIdentifier,
      islandOwnedBySubmission:
        selectedIsland?.ownerTokenIdentifier ===
        submission.ownerTokenIdentifier,
      checkInDayIsCurrent:
        checkIn !== null &&
        isCurrentLocalDate(checkIn.localDate, checkIn.timeZone),
    });
    if (sourceFailureMessage !== null) {
      await ctx.db.patch(submission._id, {
        status: "failed",
        errorMessage: sourceFailureMessage,
        updatedAt: Date.now(),
      });
      return null;
    }

    if (checkIn === null || selectedIsland === null) return null;

    const sourceKey = `structured:${submission._id}`;
    const existing = await ctx.db
      .query("checkInInterpretations")
      .withIndex("by_owner_source", (index) =>
        index
          .eq("ownerTokenIdentifier", submission.ownerTokenIdentifier)
          .eq("sourceKey", sourceKey),
      )
      .unique();
    if (
      existing !== null &&
      (existing.status === "applied" ||
        existing.status === "interpreting" ||
        existing.attempts >= interpretationRetryLimit)
    ) {
      return null;
    }

    const now = Date.now();
    const attempt = (existing?.attempts ?? 0) + 1;
    const interpretationId =
      existing?._id ??
      (await ctx.db.insert("checkInInterpretations", {
        ownerTokenIdentifier: submission.ownerTokenIdentifier,
        checkInId: checkIn._id,
        threadId: checkIn.threadId,
        localDate: checkIn.localDate,
        timeZone: checkIn.timeZone,
        sourceKind: "structuredQuestionnaire",
        sourceKey,
        structuredSubmissionId: submission._id,
        status: "queued",
        attempts: 0,
        activityIds: [],
        createdAt: now,
        updatedAt: now,
      }));
    await ctx.db.patch(interpretationId, {
      status: "interpreting",
      attempts: attempt,
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(submission._id, {
      status: "interpreting",
      interpretationId,
      errorMessage: undefined,
      updatedAt: now,
    });
    await scheduleExpiry(ctx, interpretationId, attempt);
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", submission.ownerTokenIdentifier),
      )
      .order("asc")
      .collect();

    return {
      interpretationId,
      attempt,
      ownerTokenIdentifier: submission.ownerTokenIdentifier,
      threadId: checkIn.threadId,
      selectedIslandId: selectedIsland._id,
      islands: islands.map((island) => ({
        id: island._id,
        name: island.name,
        purpose: island.purpose,
      })),
      answers: submission.answers,
    };
  },
});

export const applyInterpretation = internalMutation({
  args: {
    interpretationId: v.id("checkInInterpretations"),
    attempt: v.number(),
    activities: v.array(activityInputValidator),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const interpretation = await ctx.db.get(args.interpretationId);
    if (
      interpretation === null ||
      interpretation.status !== "interpreting" ||
      interpretation.attempts !== args.attempt
    ) {
      return false;
    }

    const checkIn = await ctx.db.get(interpretation.checkInId);
    const sourceIsValid =
      interpretation.sourceKind === "conversation"
        ? checkIn?.status === "complete"
        : checkIn !== null &&
          interpretation.structuredSubmissionId !== undefined &&
          isCurrentLocalDate(checkIn.localDate, checkIn.timeZone);
    if (
      checkIn === null ||
      !sourceIsValid ||
      checkIn.ownerTokenIdentifier !== interpretation.ownerTokenIdentifier ||
      checkIn.threadId !== interpretation.threadId ||
      checkIn.localDate !== interpretation.localDate ||
      checkIn.timeZone !== interpretation.timeZone
    ) {
      throw new Error("The completed check-in changed before it was applied.");
    }

    const ownedIslands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq(
          "ownerTokenIdentifier",
          interpretation.ownerTokenIdentifier,
        ),
      )
      .collect();
    const islandsById = new Map(
      ownedIslands.map((island) => [island._id as string, island]),
    );

    for (const activity of args.activities) {
      for (const effect of activity.islandEffects) {
        if (!islandsById.has(effect.islandId as string)) {
          throw new Error("An interpreted activity referenced an unavailable island.");
        }
      }
    }

    const now = Date.now();
    const activityIds: Id<"activities">[] = [];
    const signalsByIsland = new Map<
      string,
      {
        islandId: Id<"islands">;
        summaries: string[];
        activityIds: Id<"activities">[];
        hasPositiveActivity: boolean;
        positiveActivityCount: number;
        hasHarmfulActivity: boolean;
        positiveDetailKey?: (typeof args.activities)[number]["islandEffects"][number]["positiveDetailKey"];
      }
    >();

    for (let index = 0; index < args.activities.length; index += 1) {
      const activity = args.activities[index];
      const activityId = await ctx.db.insert("activities", {
        ownerTokenIdentifier: interpretation.ownerTokenIdentifier,
        checkInId: interpretation.checkInId,
        interpretationId: interpretation._id,
        structuredSubmissionId: interpretation.structuredSubmissionId,
        threadId: interpretation.threadId,
        localDate: interpretation.localDate,
        timeZone: interpretation.timeZone,
        activityKey: `${interpretation._id}:${index}`,
        activity: activity.activity,
        durationMinutes: activity.durationMinutes ?? undefined,
        time: activity.time ?? undefined,
        sentiment: activity.sentiment,
        tags: activity.tags,
        originalEntries: activity.originalEntries,
        affectedIslands: activity.islandEffects.map((effect) => ({
          islandId: effect.islandId,
          effect: effect.effect,
          positiveDetailKey: effect.positiveDetailKey ?? undefined,
        })),
        createdAt: now,
        updatedAt: now,
      });
      activityIds.push(activityId);

      for (const effect of activity.islandEffects) {
        const key = effect.islandId as string;
        const signal = signalsByIsland.get(key) ?? {
          islandId: effect.islandId,
          summaries: [],
          activityIds: [],
          hasPositiveActivity: false,
          positiveActivityCount: 0,
          hasHarmfulActivity: false,
        };
        signal.summaries.push(activity.activity);
        signal.activityIds.push(activityId);
        signal.hasPositiveActivity ||=
          effect.effect === "supportive" || effect.effect === "both";
        if (effect.effect === "supportive" || effect.effect === "both") {
          signal.positiveActivityCount += 1;
        }
        signal.hasHarmfulActivity ||=
          effect.effect === "harmful" || effect.effect === "both";
        if (
          signal.positiveDetailKey === undefined &&
          effect.positiveDetailKey !== null
        ) {
          signal.positiveDetailKey = effect.positiveDetailKey;
        }
        signalsByIsland.set(key, signal);
      }
    }

    for (const signal of signalsByIsland.values()) {
      const island = islandsById.get(signal.islandId as string);
      if (island === undefined) continue;
      const existingDaily = await ctx.db
        .query("islandDailySummaries")
        .withIndex("by_owner_island_date_zone", (index) =>
          index
            .eq("ownerTokenIdentifier", interpretation.ownerTokenIdentifier)
            .eq("islandId", signal.islandId)
            .eq("localDate", interpretation.localDate)
            .eq("timeZone", interpretation.timeZone),
        )
        .unique();
      const existingGrowth = await ctx.db
        .query("islandGrowthStates")
        .withIndex("by_owner_island", (index) =>
          index
            .eq("ownerTokenIdentifier", interpretation.ownerTokenIdentifier)
            .eq("islandId", signal.islandId),
        )
        .unique();
      const result = applyDailyIslandSignal(
        existingGrowth === null
          ? emptyGrowthState()
          : {
              lifetimePositivePoints: existingGrowth.lifetimePositivePoints,
              lifetimeNegativePoints: existingGrowth.lifetimeNegativePoints,
              rockCount: existingGrowth.rockCount,
              growthStepCount: existingGrowth.growthStepCount,
              isSunk: existingGrowth.isSunk,
              smallDetailKeys: existingGrowth.smallDetailKeys,
              milestoneDetailKeys: existingGrowth.milestoneDetailKeys,
            },
        existingDaily === null
          ? null
          : {
              hasPositiveNode: existingDaily.hasPositiveNode,
              positivePointCount: existingDaily.positivePointCount,
              hasNegativePoint: existingDaily.hasNegativePoint,
              summary: existingDaily.summary,
              activityKeys: existingDaily.activityIds.map(String),
              positiveDetailKey: existingDaily.positiveDetailKey,
            },
        {
          hasPositiveActivity: signal.hasPositiveActivity,
          positiveActivityCount: signal.positiveActivityCount,
          hasHarmfulActivity: signal.hasHarmfulActivity,
          summary: [...new Set(signal.summaries)].join("; "),
          activityKeys: signal.activityIds.map(String),
          positiveDetailKey: signal.positiveDetailKey ?? undefined,
        },
      );
      const dailyPatch = {
        hasPositiveNode: result.dailySummary.hasPositiveNode,
        positivePointCount: result.dailySummary.positivePointCount,
        hasNegativePoint: result.dailySummary.hasNegativePoint,
        summary: result.dailySummary.summary,
        activityIds: result.dailySummary.activityKeys as Id<"activities">[],
        positiveDetailKey: result.dailySummary.positiveDetailKey,
        updatedAt: now,
      };
      if (existingDaily === null) {
        await ctx.db.insert("islandDailySummaries", {
          ownerTokenIdentifier: interpretation.ownerTokenIdentifier,
          islandId: signal.islandId,
          localDate: interpretation.localDate,
          timeZone: interpretation.timeZone,
          ...dailyPatch,
          createdAt: now,
        });
      } else {
        await ctx.db.patch(existingDaily._id, dailyPatch);
      }

      const growthPatch = { ...result.state, updatedAt: now };
      if (existingGrowth === null) {
        await ctx.db.insert("islandGrowthStates", {
          ownerTokenIdentifier: interpretation.ownerTokenIdentifier,
          islandId: signal.islandId,
          ...growthPatch,
          createdAt: now,
        });
      } else {
        await ctx.db.patch(existingGrowth._id, growthPatch);
      }
    }

    await ctx.db.patch(interpretation._id, {
      status: "applied",
      activityIds,
      errorMessage: undefined,
      appliedAt: now,
      updatedAt: now,
    });
    if (interpretation.structuredSubmissionId !== undefined) {
      await ctx.db.patch(interpretation.structuredSubmissionId, {
        status: "applied",
        errorMessage: undefined,
        updatedAt: now,
      });
    }
    return true;
  },
});

export const failInterpretation = internalMutation({
  args: {
    interpretationId: v.id("checkInInterpretations"),
    attempt: v.number(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const interpretation = await ctx.db.get(args.interpretationId);
    if (
      interpretation === null ||
      interpretation.status !== "interpreting" ||
      interpretation.attempts !== args.attempt
    ) {
      return null;
    }
    await ctx.db.patch(interpretation._id, {
      status: "failed",
      errorMessage: args.message.slice(0, 240),
      updatedAt: Date.now(),
    });
    if (interpretation.structuredSubmissionId !== undefined) {
      await ctx.db.patch(interpretation.structuredSubmissionId, {
        status: "failed",
        errorMessage: args.message.slice(0, 240),
        updatedAt: Date.now(),
      });
    }
    if (args.attempt < interpretationRetryLimit) {
      if (interpretation.structuredSubmissionId === undefined) {
        await ctx.scheduler.runAfter(
          2_000,
          internal.activityInterpretation.interpretCompletedCheckIn,
          { checkInId: interpretation.checkInId },
        );
      } else {
        await ctx.scheduler.runAfter(
          2_000,
          internal.structuredCheckIn.interpretStructuredSubmission,
          { submissionId: interpretation.structuredSubmissionId },
        );
      }
    }
    return null;
  },
});

export const expireInterpretation = internalMutation({
  args: {
    interpretationId: v.id("checkInInterpretations"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const interpretation = await ctx.db.get(args.interpretationId);
    if (
      interpretation === null ||
      interpretation.status !== "interpreting" ||
      interpretation.attempts !== args.attempt ||
      Date.now() - interpretation.updatedAt < staleInterpretationThresholdMs
    ) {
      return null;
    }
    await ctx.db.patch(interpretation._id, {
      status: "failed",
      errorMessage: "Activity interpretation timed out.",
      updatedAt: Date.now(),
    });
    if (interpretation.structuredSubmissionId !== undefined) {
      await ctx.db.patch(interpretation.structuredSubmissionId, {
        status: "failed",
        errorMessage: "Activity interpretation timed out.",
        updatedAt: Date.now(),
      });
    }
    if (args.attempt < interpretationRetryLimit) {
      if (interpretation.structuredSubmissionId === undefined) {
        await ctx.scheduler.runAfter(
          0,
          internal.activityInterpretation.interpretCompletedCheckIn,
          { checkInId: interpretation.checkInId },
        );
      } else {
        await ctx.scheduler.runAfter(
          0,
          internal.structuredCheckIn.interpretStructuredSubmission,
          { submissionId: interpretation.structuredSubmissionId },
        );
      }
    }
    return null;
  },
});

export const listMyGrowth = query({
  args: {},
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("asc")
      .collect();
    const states = await ctx.db
      .query("islandGrowthStates")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .collect();
    const statesByIsland = new Map(
      states.map((state) => [state.islandId as string, state]),
    );

    return islands.map((island) => {
      const state = statesByIsland.get(island._id as string);
      return {
        islandId: island._id,
        lifetimePositivePoints: state?.lifetimePositivePoints ?? 0,
        lifetimeNegativePoints: state?.lifetimeNegativePoints ?? 0,
        rockCount: state?.rockCount ?? 0,
        growthStepCount: state?.growthStepCount ?? 0,
        isSunk: state?.isSunk ?? false,
        smallDetailKeys: state?.smallDetailKeys ?? [],
        milestoneDetailKeys: state?.milestoneDetailKeys ?? [],
        updatedAt: state?.updatedAt ?? island.createdAt,
      };
    });
  },
});

export const getMyCheckInApplication = query({
  args: { checkInId: v.id("dailyCheckIns") },
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await ctx.db.get(args.checkInId);
    if (
      checkIn === null ||
      checkIn.ownerTokenIdentifier !== ownerTokenIdentifier
    ) {
      throw new ConvexError({
        code: "CHECK_IN_NOT_FOUND",
        message: "That daily check-in is unavailable.",
      });
    }
    const interpretations = await ctx.db
      .query("checkInInterpretations")
      .withIndex("by_check_in", (index) => index.eq("checkInId", checkIn._id))
      .collect();
    const interpretation = conversationInterpretationOrNull(interpretations);
    return interpretation === null
      ? null
      : {
          status: interpretation.status,
          attempts: interpretation.attempts,
          activityCount: interpretation.activityIds.length,
          errorMessage: interpretation.errorMessage ?? null,
          appliedAt: interpretation.appliedAt ?? null,
        };
  },
});

export const retryMyCheckInApplication = mutation({
  args: { checkInId: v.id("dailyCheckIns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await ctx.db.get(args.checkInId);
    if (
      checkIn === null ||
      checkIn.ownerTokenIdentifier !== ownerTokenIdentifier ||
      checkIn.status !== "complete"
    ) {
      throw new ConvexError({
        code: "CHECK_IN_NOT_FOUND",
        message: "That completed daily check-in is unavailable.",
      });
    }
    const interpretations = await ctx.db
      .query("checkInInterpretations")
      .withIndex("by_check_in", (index) => index.eq("checkInId", checkIn._id))
      .collect();
    const interpretation = conversationInterpretationOrNull(interpretations);
    if (interpretation === null || interpretation.status !== "failed") {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch(interpretation._id, {
      status: "queued",
      attempts: 0,
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.activityInterpretation.interpretCompletedCheckIn,
      { checkInId: checkIn._id },
    );
    return null;
  },
});
