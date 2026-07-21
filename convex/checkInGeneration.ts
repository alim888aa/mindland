import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { dailyCheckInAgent } from "./checkInAgent";
import { classifyCheckInCompletion } from "./checkInCompletion";
import type { CheckInCompletionDecision } from "./checkInCompletionPolicy";
import { createCheckInGenerationLease } from "./checkInPolicy";
import { checkInInstructions } from "./checkInPrompt";
import {
  carryLatestCheckInMessages,
  maximumCarriedCheckInMessages,
  maximumExaminedPreviousCheckInMessages,
} from "./checkInContextPolicy";
import { logSafeFailure } from "./safeErrorLog";

async function loadPreviousCheckInMessages(
  ctx: Parameters<typeof dailyCheckInAgent.listMessages>[0],
  threadId: string | null,
) {
  if (threadId === null) return [];

  let cursor: string | null = null;
  const candidates: Array<{
    role: string;
    text?: string;
    order: number;
    stepOrder: number;
  }> = [];
  let examinedMessages = 0;

  while (examinedMessages < maximumExaminedPreviousCheckInMessages) {
    const remaining =
      maximumExaminedPreviousCheckInMessages - examinedMessages;
    const page = await dailyCheckInAgent.listMessages(ctx, {
      threadId,
      paginationOpts: {
        cursor,
        numItems: Math.min(maximumCarriedCheckInMessages, remaining),
      },
      excludeToolMessages: true,
      statuses: ["success"],
    });
    examinedMessages += page.page.length;
    candidates.push(
      ...page.page.map((message) => ({
        role: message.message?.role ?? "",
        text: message.text,
        order: message.order,
        stepOrder: message.stepOrder,
      })),
    );
    const carried = carryLatestCheckInMessages(candidates);
    if (carried.length >= maximumCarriedCheckInMessages || page.isDone) {
      return carried;
    }
    cursor = page.continueCursor;
  }

  return carryLatestCheckInMessages(candidates);
}

export const generateReply = internalAction({
  args: {
    submissionId: v.id("checkInSubmissions"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const generation = await ctx.runMutation(
      internal.checkIn.claimGeneration,
      { submissionId: args.submissionId, attempt: args.attempt },
    );

    if (generation === null) {
      return null;
    }

    const generationLease = createCheckInGenerationLease();

    try {
      let carriedMessages: ReturnType<typeof carryLatestCheckInMessages> = [];
      try {
        carriedMessages = await loadPreviousCheckInMessages(
          ctx,
          generation.previousThreadId,
        );
      } catch (error) {
        logSafeFailure(
          "Previous daily check-in context could not be loaded",
          error,
        );
      }
      const result = await dailyCheckInAgent.streamText(
        ctx,
        {
          threadId: generation.threadId,
          userId: generation.ownerTokenIdentifier,
        },
        {
          promptMessageId: generation.promptMessageId,
          system: checkInInstructions(generation.islands, carriedMessages),
          abortSignal: generationLease.signal,
          providerOptions: {
            openai: {
              reasoningEffort: "low",
              store: false,
              textVerbosity: "low",
            },
          },
        },
        {
          saveStreamDeltas: {
            chunking: "word",
            returnImmediately: true,
            throttleMs: 100,
          },
        },
      );
      let streamError: unknown;
      await result.consumeStream({
        onError: (error) => {
          streamError = error;
        },
      });

      if (streamError !== undefined) {
        throw streamError;
      }

      if (generationLease.signal.aborted) {
        throw generationLease.signal.reason;
      }
    } catch (error) {
      logSafeFailure("Daily check-in generation failed", error);
      await ctx.runMutation(internal.checkIn.failGeneration, {
        submissionId: args.submissionId,
        attempt: args.attempt,
      });
      return null;
    } finally {
      generationLease.release();
    }

    let decision: CheckInCompletionDecision = {
      status: generation.statusBeforeReply,
    };

    try {
      decision = await classifyCheckInCompletion(ctx, {
        threadId: generation.threadId,
        ownerTokenIdentifier: generation.ownerTokenIdentifier,
      });
    } catch (error) {
      logSafeFailure("Daily check-in completion extraction failed", error);
    }

    try {
      await ctx.runMutation(internal.checkIn.completeGeneration, {
        submissionId: args.submissionId,
        attempt: args.attempt,
        decision,
      });
      if (
        generation.statusBeforeReply === "awaitingConfirmation" &&
        decision.status === "complete"
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.activityInterpretation.interpretCompletedCheckIn,
          { checkInId: generation.checkInId },
        );
      }
    } catch (error) {
      logSafeFailure("Daily check-in completion bookkeeping failed", error);
      try {
        await ctx.runMutation(internal.checkIn.failGeneration, {
          submissionId: args.submissionId,
          attempt: args.attempt,
        });
      } catch (failureError) {
        logSafeFailure(
          "Daily check-in completion failure could not be recorded",
          failureError,
        );
      }
    }

    return null;
  },
});
