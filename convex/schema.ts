import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { islandVisualThemeKeyValidator } from "./islandCatalogue";
import {
  islandDetailKeyValidator,
  islandMilestoneDetailKeyValidator,
} from "./islandVisualDetails";
import {
  islandQuestionnaireSourceValidator,
  islandQuestionValidator,
} from "./islandQuestionnaireValues";

export default defineSchema({
  privateProofRecords: defineTable({
    ownerTokenIdentifier: v.string(),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerTokenIdentifier"]),
  onboardingInterviews: defineTable({
    ownerTokenIdentifier: v.string(),
    threadId: v.string(),
    status: v.union(
      v.literal("interviewing"),
      v.literal("readyToCreate"),
      v.literal("revealed"),
      v.literal("completed"),
    ),
    generationState: v.union(
      v.literal("idle"),
      v.literal("queued"),
      v.literal("streaming"),
      v.literal("failed"),
    ),
    progressPercent: v.number(),
    candidateIslandNames: v.array(v.string()),
    candidateIslands: v.optional(
      v.array(
        v.object({
          name: v.string(),
          purpose: v.string(),
          sourceContext: v.string(),
          visualThemeKey: islandVisualThemeKeyValidator,
        }),
      ),
    ),
    candidateNamesRevealedAt: v.optional(v.number()),
    islandsMaterializedAt: v.optional(v.number()),
    activeSubmissionId: v.optional(v.id("onboardingSubmissions")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_thread", ["threadId"]),
  onboardingSubmissions: defineTable({
    ownerTokenIdentifier: v.string(),
    interviewId: v.id("onboardingInterviews"),
    clientRequestId: v.string(),
    requestTextHash: v.string(),
    promptMessageId: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("streaming"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_interview", ["interviewId"])
    .index("by_owner_interview_request", [
      "ownerTokenIdentifier",
      "interviewId",
      "clientRequestId",
    ]),
  dailyCheckIns: defineTable({
    ownerTokenIdentifier: v.string(),
    localDate: v.string(),
    timeZone: v.string(),
    threadId: v.string(),
    status: v.union(
      v.literal("collecting"),
      v.literal("awaitingConfirmation"),
      v.literal("complete"),
    ),
    generationState: v.union(
      v.literal("idle"),
      v.literal("queued"),
      v.literal("streaming"),
      v.literal("failed"),
    ),
    activeSubmissionId: v.optional(v.id("checkInSubmissions")),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_status_completed", [
      "ownerTokenIdentifier",
      "status",
      "completedAt",
    ])
    .index("by_owner_date", ["ownerTokenIdentifier", "localDate"])
    .index("by_owner_date_time_zone", [
      "ownerTokenIdentifier",
      "localDate",
      "timeZone",
    ])
    .index("by_thread", ["threadId"]),
  checkInSubmissions: defineTable({
    ownerTokenIdentifier: v.string(),
    checkInId: v.id("dailyCheckIns"),
    clientRequestId: v.string(),
    requestText: v.optional(v.string()),
    requestTextHash: v.optional(v.string()),
    promptMessageId: v.string(),
    promptOrder: v.optional(v.number()),
    statusBeforeReply: v.union(
      v.literal("collecting"),
      v.literal("awaitingConfirmation"),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("streaming"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    retryRequestedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_check_in", ["checkInId"])
    .index("by_owner_check_in_request", [
      "ownerTokenIdentifier",
      "checkInId",
      "clientRequestId",
    ]),
  islands: defineTable({
    ownerTokenIdentifier: v.string(),
    islandKey: v.string(),
    name: v.string(),
    purpose: v.string(),
    source: v.object({
      kind: v.literal("onboarding"),
      interviewId: v.id("onboardingInterviews"),
      context: v.string(),
    }),
    visualThemeKey: islandVisualThemeKeyValidator,
    visualSeed: v.number(),
    questionnaire: v.optional(v.array(islandQuestionValidator)),
    questionnaireSource: v.optional(islandQuestionnaireSourceValidator),
    questionnaireGeneratedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_island_key", ["ownerTokenIdentifier", "islandKey"])
    .index("by_source_interview", ["source.interviewId"]),
  checkInInterpretations: defineTable({
    ownerTokenIdentifier: v.string(),
    checkInId: v.id("dailyCheckIns"),
    threadId: v.string(),
    localDate: v.string(),
    timeZone: v.string(),
    sourceKind: v.union(
      v.literal("conversation"),
      v.literal("structuredQuestionnaire"),
    ),
    sourceKey: v.string(),
    structuredSubmissionId: v.optional(v.id("structuredCheckInSubmissions")),
    status: v.union(
      v.literal("queued"),
      v.literal("interpreting"),
      v.literal("applied"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    activityIds: v.array(v.id("activities")),
    errorMessage: v.optional(v.string()),
    appliedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_check_in", ["checkInId"])
    .index("by_owner_source", ["ownerTokenIdentifier", "sourceKey"])
    .index("by_owner", ["ownerTokenIdentifier"]),
  structuredCheckInSubmissions: defineTable({
    ownerTokenIdentifier: v.string(),
    checkInId: v.id("dailyCheckIns"),
    islandId: v.id("islands"),
    clientRequestId: v.string(),
    requestBody: v.string(),
    answers: v.array(
      v.object({
        questionId: v.string(),
        question: v.string(),
        answer: v.union(v.string(), v.null()),
      }),
    ),
    status: v.union(
      v.literal("queued"),
      v.literal("interpreting"),
      v.literal("applied"),
      v.literal("failed"),
    ),
    interpretationId: v.optional(v.id("checkInInterpretations")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_check_in_request", [
      "ownerTokenIdentifier",
      "checkInId",
      "clientRequestId",
    ])
    .index("by_check_in", ["checkInId"])
    .index("by_owner", ["ownerTokenIdentifier"]),
  activities: defineTable({
    ownerTokenIdentifier: v.string(),
    checkInId: v.id("dailyCheckIns"),
    interpretationId: v.id("checkInInterpretations"),
    structuredSubmissionId: v.optional(v.id("structuredCheckInSubmissions")),
    threadId: v.string(),
    localDate: v.string(),
    timeZone: v.string(),
    activityKey: v.string(),
    activity: v.string(),
    durationMinutes: v.optional(v.number()),
    time: v.optional(v.string()),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("neutral"),
      v.literal("negative"),
      v.literal("mixed"),
    ),
    tags: v.array(v.string()),
    originalEntries: v.array(
      v.object({
        messageId: v.string(),
        text: v.string(),
      }),
    ),
    affectedIslands: v.array(
      v.object({
        islandId: v.id("islands"),
        effect: v.union(
          v.literal("supportive"),
          v.literal("harmful"),
          v.literal("both"),
        ),
        positiveDetailKey: v.optional(islandDetailKeyValidator),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_check_in", ["checkInId"])
    .index("by_interpretation", ["interpretationId"]),
  islandDailySummaries: defineTable({
    ownerTokenIdentifier: v.string(),
    islandId: v.id("islands"),
    localDate: v.string(),
    timeZone: v.string(),
    hasPositiveNode: v.boolean(),
    positivePointCount: v.optional(v.number()),
    hasNegativePoint: v.boolean(),
    summary: v.string(),
    activityIds: v.array(v.id("activities")),
    positiveDetailKey: v.optional(islandDetailKeyValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_island_date_zone", [
      "ownerTokenIdentifier",
      "islandId",
      "localDate",
      "timeZone",
    ])
    .index("by_island", ["islandId"]),
  islandGrowthStates: defineTable({
    ownerTokenIdentifier: v.string(),
    islandId: v.id("islands"),
    lifetimePositivePoints: v.number(),
    lifetimeNegativePoints: v.number(),
    rockCount: v.number(),
    growthStepCount: v.number(),
    isSunk: v.boolean(),
    smallDetailKeys: v.array(islandDetailKeyValidator),
    milestoneDetailKeys: v.array(islandMilestoneDetailKeyValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_island", ["islandId"])
    .index("by_owner_island", ["ownerTokenIdentifier", "islandId"]),
});
