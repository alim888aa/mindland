import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";
import { generateQuestionnaires } from "./islandQuestionnaireGeneration";

export const generateForInterview = action({
  args: { interviewId: v.id("onboardingInterviews") },
  returns: v.object({
    interviewId: v.id("onboardingInterviews"),
    islandNames: v.array(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    interviewId: typeof args.interviewId;
    islandNames: string[];
  }> => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const claim = await ctx.runQuery(
      internal.islandQuestionnaireGeneration.loadForInterview,
      { interviewId: args.interviewId, ownerTokenIdentifier },
    );
    if (claim === null) {
      throw new ConvexError({
        code: "INTERVIEW_NOT_FOUND",
        message: "That interview is unavailable.",
      });
    }
    const questionnaires =
      claim.islands.length === 0
        ? []
        : await generateQuestionnaires(ctx, claim);
    const result = await ctx.runMutation(
      internal.islandQuestionnaireGeneration.applyQuestionnaires,
      {
        ownerTokenIdentifier,
        revealInterviewId: args.interviewId,
        questionnaires,
      },
    );
    return {
      interviewId: result.interviewId!,
      islandNames: result.islandNames,
    };
  },
});

export const ensureMine = action({
  args: {},
  returns: v.object({ generated: v.number() }),
  handler: async (ctx): Promise<{ generated: number }> => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const claims = await ctx.runQuery(
      internal.islandQuestionnaireGeneration.loadMissingMine,
      { ownerTokenIdentifier },
    );
    let generated = 0;
    for (const claim of claims) {
      const questionnaires = await generateQuestionnaires(ctx, claim);
      await ctx.runMutation(
        internal.islandQuestionnaireGeneration.applyQuestionnaires,
        { ownerTokenIdentifier, questionnaires },
      );
      generated += questionnaires.length;
    }
    return { generated };
  },
});
