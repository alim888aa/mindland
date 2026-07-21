import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, mutation, query } from "./_generated/server";
import {
  activityInterpretationSchema,
  interpretationPrompt,
} from "./activityInterpretation";
import { requireOwnerTokenIdentifier } from "./auth";
import { dailyCheckInAgent } from "./checkInAgent";
import { isCurrentLocalDate } from "./checkInPolicy";
import type { IslandDetailKey } from "./islandVisualDetails";
import { logSafeFailure } from "./safeErrorLog";
import {
  prepareActivityApplicationInput,
} from "../src/domain/check-in-activity-interpretation";
import {
  isSameStructuredCheckInRequest,
  structuredCheckInRequestBody,
  structuredSubmissionRetryAction,
} from "../src/domain/structured-check-in-policy";

const interpretationRetryLimit = 3;

const answerValidator = v.object({
  questionId: v.string(),
  question: v.string(),
  answer: v.union(v.string(), v.null()),
});

const receiptValidator = v.object({
  submissionId: v.id("structuredCheckInSubmissions"),
  status: v.union(
    v.literal("queued"),
    v.literal("interpreting"),
    v.literal("applied"),
    v.literal("failed"),
  ),
  accepted: v.boolean(),
  errorMessage: v.union(v.string(), v.null()),
});

function receipt(
  submission: {
    _id: Id<"structuredCheckInSubmissions">;
    status: "queued" | "interpreting" | "applied" | "failed";
    errorMessage?: string;
  },
  accepted: boolean,
) {
  return {
    submissionId: submission._id,
    status: submission.status,
    accepted,
    errorMessage: submission.errorMessage ?? null,
  };
}

function validateAnswers(
  answers: ReadonlyArray<{
    questionId: string;
    question: string;
    answer: string | null;
  }>,
) {
  if (answers.length < 1 || answers.length > 7) {
    throw new ConvexError({
      code: "INVALID_QUESTIONNAIRE",
      message: "A guided check-in needs between one and seven questions.",
    });
  }
  const questionIds = new Set<string>();
  for (const answer of answers) {
    if (
      answer.questionId.trim().length === 0 ||
      answer.questionId.length > 100 ||
      questionIds.has(answer.questionId) ||
      answer.question.trim().length === 0 ||
      answer.question.length > 300 ||
      (answer.answer !== null && answer.answer.length > 2_000)
    ) {
      throw new ConvexError({
        code: "INVALID_QUESTIONNAIRE",
        message: "That guided check-in contains an invalid answer.",
      });
    }
    questionIds.add(answer.questionId);
  }
}

export const submit = mutation({
  args: {
    checkInId: v.id("dailyCheckIns"),
    islandId: v.id("islands"),
    clientRequestId: v.string(),
    answers: v.array(answerValidator),
  },
  returns: receiptValidator,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await ctx.db.get(args.checkInId);
    const island = await ctx.db.get(args.islandId);
    if (
      checkIn === null ||
      island === null ||
      checkIn.ownerTokenIdentifier !== ownerTokenIdentifier ||
      island.ownerTokenIdentifier !== ownerTokenIdentifier
    ) {
      throw new ConvexError({
        code: "CHECK_IN_NOT_FOUND",
        message: "That guided check-in is unavailable.",
      });
    }
    if (!isCurrentLocalDate(checkIn.localDate, checkIn.timeZone)) {
      throw new ConvexError({
        code: "CHECK_IN_CLOSED",
        message: "That daily check-in has ended.",
      });
    }
    const clientRequestId = args.clientRequestId.trim();
    if (clientRequestId.length === 0 || clientRequestId.length > 128) {
      throw new ConvexError({
        code: "INVALID_REQUEST_ID",
        message: "This guided check-in needs a valid request identifier.",
      });
    }
    validateAnswers(args.answers);
    const requestBody = structuredCheckInRequestBody({
      islandId: args.islandId,
      answers: args.answers,
    });
    const existing = await ctx.db
      .query("structuredCheckInSubmissions")
      .withIndex("by_owner_check_in_request", (index) =>
        index
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("checkInId", checkIn._id)
          .eq("clientRequestId", clientRequestId),
      )
      .unique();
    if (existing !== null) {
      if (
        !isSameStructuredCheckInRequest(existing.requestBody, {
          islandId: args.islandId,
          answers: args.answers,
        })
      ) {
        throw new ConvexError({
          code: "REQUEST_ID_REUSED",
          message:
            "This request identifier already belongs to another guided check-in.",
        });
      }
      const interpretation = existing.interpretationId
        ? await ctx.db.get(existing.interpretationId)
        : null;
      const retryAction = structuredSubmissionRetryAction({
        status: existing.status,
        interpretationAttempts: interpretation?.attempts ?? 0,
        retryLimit: interpretationRetryLimit,
      });
      if (retryAction === "queue") {
        await ctx.db.patch(existing._id, {
          status: "queued",
          errorMessage: undefined,
          updatedAt: Date.now(),
        });
        await ctx.scheduler.runAfter(
          0,
          internal.structuredCheckIn.interpretStructuredSubmission,
          { submissionId: existing._id },
        );
        const queued = await ctx.db.get(existing._id);
        return receipt(queued!, true);
      }
      return receipt(existing, false);
    }

    const now = Date.now();
    const submissionId = await ctx.db.insert("structuredCheckInSubmissions", {
      ownerTokenIdentifier,
      checkInId: checkIn._id,
      islandId: island._id,
      clientRequestId,
      requestBody,
      answers: args.answers,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.structuredCheckIn.interpretStructuredSubmission,
      { submissionId },
    );
    const submission = await ctx.db.get(submissionId);
    return receipt(submission!, true);
  },
});

export const getSubmission = query({
  args: { submissionId: v.id("structuredCheckInSubmissions") },
  returns: v.union(receiptValidator, v.null()),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const submission = await ctx.db.get(args.submissionId);
    if (
      submission === null ||
      submission.ownerTokenIdentifier !== ownerTokenIdentifier
    ) {
      return null;
    }
    return receipt(submission, false);
  },
});

export const interpretStructuredSubmission = internalAction({
  args: { submissionId: v.id("structuredCheckInSubmissions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.activityApplication.claimStructuredInterpretation,
      { submissionId: args.submissionId },
    );
    if (claim === null) return null;

    try {
      const sourceEntries = claim.answers
        .filter(
          (answer) =>
            answer.answer !== null && answer.answer.trim().length > 0,
        )
        .map((answer) => ({
          messageId: `${args.submissionId}:${answer.questionId}`,
          text: answer.answer!,
          promptText: `${answer.question}\nAnswer: ${answer.answer!}`,
        }));
      if (sourceEntries.length === 0) {
        await ctx.runMutation(
          internal.activityApplication.applyInterpretation,
          {
            interpretationId: claim.interpretationId,
            attempt: claim.attempt,
            activities: [],
          },
        );
        return null;
      }

      const prompt = `${interpretationPrompt(
        claim.islands,
        sourceEntries.map((entry) => ({
          messageId: entry.messageId,
          text: entry.promptText,
        })),
      )}\n\nThis came from a guided questionnaire opened from island ${claim.selectedIslandId}. That selected island is useful context, but map each answer to every owned island it genuinely affects.`;
      const result = await dailyCheckInAgent.generateObject(
        ctx,
        {
          threadId: claim.threadId,
          userId: claim.ownerTokenIdentifier,
        },
        {
          prompt,
          schema: activityInterpretationSchema({
            ownedIslandIds: new Set(claim.islands.map((island) => island.id)),
            userMessageIds: new Set(
              sourceEntries.map((entry) => entry.messageId),
            ),
          }),
          schemaName: "MindlandGuidedActivities",
          schemaDescription:
            "Private grounded questionnaire activities and owned-island effects.",
          providerOptions: {
            openai: { reasoningEffort: "low", store: false },
          },
        },
        {
          contextOptions: { recentMessages: 0 },
          storageOptions: { saveMessages: "none" },
        },
      );
      const exactEntries = new Map(
        sourceEntries.map((entry) => [entry.messageId, entry.text]),
      );
      await ctx.runMutation(internal.activityApplication.applyInterpretation, {
        interpretationId: claim.interpretationId,
        attempt: claim.attempt,
        activities: result.object.activities.map((activity) => {
          const applicationInput = prepareActivityApplicationInput(
            activity,
            exactEntries,
          );
          return {
            ...applicationInput,
            islandEffects: applicationInput.islandEffects.map((effect) => ({
              islandId: effect.islandId as Id<"islands">,
              effect: effect.effect,
              positiveDetailKey:
                effect.positiveDetailKey as IslandDetailKey | null,
            })),
          };
        }),
      });
    } catch (error) {
      logSafeFailure("Guided activity interpretation failed", error);
      await ctx.runMutation(internal.activityApplication.failInterpretation, {
        interpretationId: claim.interpretationId,
        attempt: claim.attempt,
        message: "Mindland couldn't apply that guided check-in yet.",
      });
    }
    return null;
  },
});
