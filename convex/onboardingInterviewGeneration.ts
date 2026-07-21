import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { onboardingAgent } from "./onboardingAgent";
import { discoverOnboardingState } from "./onboardingDiscovery";
import { logSafeFailure } from "./safeErrorLog";

export const generateReply = internalAction({
  args: {
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const generation = await ctx.runMutation(
      internal.onboardingInterview.claimGeneration,
      { submissionId: args.submissionId, attempt: args.attempt },
    );

    if (generation === null) {
      return null;
    }

    try {
      const result = await onboardingAgent.streamText(
        ctx,
        {
          threadId: generation.threadId,
          userId: generation.ownerTokenIdentifier,
        },
        {
          promptMessageId: generation.promptMessageId,
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
    } catch (error) {
      logSafeFailure("Onboarding interview generation failed", error);
      await ctx.runMutation(internal.onboardingInterview.failGeneration, {
        submissionId: args.submissionId,
        attempt: args.attempt,
      });
      return null;
    }

    try {
      const discovery = await discoverOnboardingState(ctx, {
        threadId: generation.threadId,
        ownerTokenIdentifier: generation.ownerTokenIdentifier,
      });
      await ctx.runMutation(internal.onboardingInterview.applyDiscoveryState, {
        submissionId: args.submissionId,
        attempt: args.attempt,
        interviewId: generation.interviewId,
        ownerTokenIdentifier: generation.ownerTokenIdentifier,
        progressPercent: discovery.progressPercent,
        candidateIslands: discovery.candidateIslands,
        readyToCreate: discovery.readyToCreate,
      });
    } catch (error) {
      logSafeFailure("Onboarding discovery extraction failed", error);
    }

    try {
      await ctx.runMutation(internal.onboardingInterview.completeGeneration, {
        submissionId: args.submissionId,
        attempt: args.attempt,
      });
    } catch (error) {
      logSafeFailure("Onboarding completion bookkeeping failed", error);
      try {
        await ctx.runMutation(internal.onboardingInterview.failGeneration, {
          submissionId: args.submissionId,
          attempt: args.attempt,
        });
      } catch (failureError) {
        logSafeFailure(
          "Onboarding completion failure could not be recorded",
          failureError,
        );
      }
    }

    return null;
  },
});
