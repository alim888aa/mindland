import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";
import {
  conditionFromStoredGrowth,
  effectForIsland,
  exactOriginalEntries,
  islandHistoryPageSize,
  isOwnedHistoryResource,
} from "../src/domain/island-history";

const conditionValidator = v.union(
  v.literal("aboveWater"),
  v.literal("sunk"),
);

const originalEntryValidator = v.object({
  messageId: v.string(),
  text: v.string(),
  sourceKind: v.union(
    v.literal("conversation"),
    v.literal("structuredQuestionnaire"),
  ),
  structuredSubmissionId: v.union(
    v.id("structuredCheckInSubmissions"),
    v.null(),
  ),
});

const structuredSourceValidator = v.object({
  submissionId: v.id("structuredCheckInSubmissions"),
  selectedIslandId: v.id("islands"),
  answers: v.array(
    v.object({
      questionId: v.string(),
      question: v.string(),
      answer: v.union(v.string(), v.null()),
    }),
  ),
});

const historyActivityValidator = v.object({
  activityId: v.id("activities"),
  activity: v.string(),
  durationMinutes: v.union(v.number(), v.null()),
  time: v.union(v.string(), v.null()),
  sentiment: v.union(
    v.literal("positive"),
    v.literal("neutral"),
    v.literal("negative"),
    v.literal("mixed"),
  ),
  tags: v.array(v.string()),
  effect: v.union(
    v.literal("supportive"),
    v.literal("harmful"),
    v.literal("both"),
  ),
  positiveDetailKey: v.union(v.string(), v.null()),
  originalEntries: v.array(
    v.object({ messageId: v.string(), text: v.string() }),
  ),
  sourceKind: v.union(
    v.literal("conversation"),
    v.literal("structuredQuestionnaire"),
  ),
  structuredSubmissionId: v.union(
    v.id("structuredCheckInSubmissions"),
    v.null(),
  ),
});

const historyEntryValidator = v.object({
  dailySummaryId: v.id("islandDailySummaries"),
  localDate: v.string(),
  timeZone: v.string(),
  hasPositiveNode: v.boolean(),
  hasNegativePoint: v.boolean(),
  summary: v.string(),
  positiveDetailKey: v.union(v.string(), v.null()),
  activities: v.array(historyActivityValidator),
  originalEntries: v.array(originalEntryValidator),
  structuredSources: v.array(structuredSourceValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

async function requireOwnedIsland(
  ctx: QueryCtx,
  islandId: Id<"islands">,
  ownerTokenIdentifier: string,
) {
  const island = await ctx.db.get(islandId);
  if (!isOwnedHistoryResource(island, ownerTokenIdentifier)) {
    throw new ConvexError({
      code: "ISLAND_NOT_FOUND",
      message: "That island is unavailable.",
    });
  }
  return island;
}

export const getMyIslandSummary = query({
  args: { islandId: v.id("islands") },
  returns: v.object({
    islandId: v.id("islands"),
    name: v.string(),
    purpose: v.string(),
    condition: conditionValidator,
    lifetimePositivePoints: v.number(),
    lifetimeNegativePoints: v.number(),
    rockCount: v.number(),
    growthStepCount: v.number(),
    smallDetailKeys: v.array(v.string()),
    milestoneDetailKeys: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const island = await requireOwnedIsland(
      ctx,
      args.islandId,
      ownerTokenIdentifier,
    );
    const growth = await ctx.db
      .query("islandGrowthStates")
      .withIndex("by_owner_island", (index) =>
        index
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("islandId", island._id),
      )
      .unique();

    return {
      islandId: island._id,
      name: island.name,
      purpose: island.purpose,
      condition: conditionFromStoredGrowth(growth),
      lifetimePositivePoints: growth?.lifetimePositivePoints ?? 0,
      lifetimeNegativePoints: growth?.lifetimeNegativePoints ?? 0,
      rockCount: growth?.rockCount ?? 0,
      growthStepCount: growth?.growthStepCount ?? 0,
      smallDetailKeys: growth?.smallDetailKeys ?? [],
      milestoneDetailKeys: growth?.milestoneDetailKeys ?? [],
      createdAt: island.createdAt,
      updatedAt: growth?.updatedAt ?? island.updatedAt,
    };
  },
});

async function historyEntry(
  ctx: QueryCtx,
  dailySummary: Doc<"islandDailySummaries">,
  ownerTokenIdentifier: string,
) {
  const activityDocuments = await Promise.all(
    dailySummary.activityIds.map((activityId) => ctx.db.get(activityId)),
  );
  const activities = activityDocuments.flatMap((activity) => {
    if (!isOwnedHistoryResource(activity, ownerTokenIdentifier)) {
      return [];
    }
    const effect = effectForIsland(
      activity.affectedIslands,
      dailySummary.islandId,
    );
    if (effect === null) return [];
    return [{ activity, effect }];
  });
  const structuredSubmissionIds = [
    ...new Set(
      activities.flatMap(({ activity }) =>
        activity.structuredSubmissionId
          ? [activity.structuredSubmissionId]
          : [],
      ),
    ),
  ];
  const structuredDocuments = await Promise.all(
    structuredSubmissionIds.map((submissionId) => ctx.db.get(submissionId)),
  );
  const structuredSources = structuredDocuments.flatMap((submission) =>
    isOwnedHistoryResource(submission, ownerTokenIdentifier)
      ? [
          {
            submissionId: submission._id,
            selectedIslandId: submission.islandId,
            answers: submission.answers,
          },
        ]
      : [],
  );

  return {
    dailySummaryId: dailySummary._id,
    localDate: dailySummary.localDate,
    timeZone: dailySummary.timeZone,
    hasPositiveNode: dailySummary.hasPositiveNode,
    hasNegativePoint: dailySummary.hasNegativePoint,
    summary: dailySummary.summary,
    positiveDetailKey: dailySummary.positiveDetailKey ?? null,
    activities: activities.map(({ activity, effect }) => ({
      activityId: activity._id,
      activity: activity.activity,
      durationMinutes: activity.durationMinutes ?? null,
      time: activity.time ?? null,
      sentiment: activity.sentiment,
      tags: activity.tags,
      effect: effect.effect,
      positiveDetailKey: effect.positiveDetailKey ?? null,
      originalEntries: activity.originalEntries,
      sourceKind:
        activity.structuredSubmissionId === undefined
          ? ("conversation" as const)
          : ("structuredQuestionnaire" as const),
      structuredSubmissionId: activity.structuredSubmissionId ?? null,
    })),
    originalEntries: exactOriginalEntries(
      activities.map(({ activity }) => activity),
    ).map((entry) => ({
      ...entry,
      structuredSubmissionId:
        entry.structuredSubmissionId === null
          ? null
          : (entry.structuredSubmissionId as Id<"structuredCheckInSubmissions">),
    })),
    structuredSources,
    createdAt: dailySummary.createdAt,
    updatedAt: dailySummary.updatedAt,
  };
}

export const listMyIslandHistory = query({
  args: {
    islandId: v.id("islands"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(historyEntryValidator),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const island = await requireOwnedIsland(
      ctx,
      args.islandId,
      ownerTokenIdentifier,
    );
    const page = await ctx.db
      .query("islandDailySummaries")
      .withIndex("by_owner_island_date_zone", (index) =>
        index
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("islandId", island._id),
      )
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: islandHistoryPageSize(args.paginationOpts.numItems),
      });

    return {
      ...page,
      page: await Promise.all(
        page.page.map((dailySummary) =>
          historyEntry(ctx, dailySummary, ownerTokenIdentifier),
        ),
      ),
    };
  },
});
