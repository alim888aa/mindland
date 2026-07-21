import { jsonSchema } from "ai";
import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { islandVisualThemeKeyValidator } from "./islandCatalogue";
import {
  islandQuestionnaireSourceValidator,
  islandQuestionValidator,
} from "./islandQuestionnaireValues";
import { onboardingAgent } from "./onboardingAgent";
import { logSafeFailure } from "./safeErrorLog";
import {
  materializeGeneratedQuestions,
  parseGeneratedQuestionnaireBatch,
  type GeneratedQuestionnaireBatch,
  type QuestionnaireGenerationIsland,
} from "../src/domain/island-questionnaire-generation";
import {
  createFallbackIslandQuestionnaire,
  type IslandQuestion,
} from "../src/lib/island-questionnaires";

const generationIslandValidator = v.object({
  id: v.id("islands"),
  islandKey: v.string(),
  name: v.string(),
  purpose: v.string(),
  sourceContext: v.string(),
  visualThemeKey: islandVisualThemeKeyValidator,
});

const generatedQuestionnaireValidator = v.object({
  islandId: v.id("islands"),
  source: islandQuestionnaireSourceValidator,
  questions: v.array(islandQuestionValidator),
});

type GenerationIsland = {
  id: Id<"islands">;
  islandKey: string;
  name: string;
  purpose: string;
  sourceContext: string;
  visualThemeKey: "health" | "relationships" | "work" | "learning";
};

const generatedBatchSchema = (islands: readonly GenerationIsland[]) =>
  jsonSchema<GeneratedQuestionnaireBatch>(
    {
      type: "object",
      additionalProperties: false,
      required: ["questionnaires"],
      properties: {
        questionnaires: {
          type: "array",
          minItems: islands.length,
          maxItems: islands.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["islandKey", "questions"],
            properties: {
              islandKey: {
                type: "string",
                enum: islands.map((island) => island.islandKey),
              },
              questions: {
                type: "array",
                minItems: 3,
                maxItems: 7,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "prompt",
                    "detail",
                    "kind",
                    "options",
                    "placeholder",
                    "unit",
                  ],
                  properties: {
                    prompt: { type: "string", minLength: 1, maxLength: 180 },
                    detail: {
                      anyOf: [
                        { type: "string", maxLength: 180 },
                        { type: "null" },
                      ],
                    },
                    kind: {
                      type: "string",
                      enum: ["choice", "text", "number", "time"],
                    },
                    options: {
                      type: "array",
                      maxItems: 5,
                      items: { type: "string", minLength: 1, maxLength: 48 },
                    },
                    placeholder: {
                      anyOf: [
                        { type: "string", maxLength: 80 },
                        { type: "null" },
                      ],
                    },
                    unit: {
                      anyOf: [
                        { type: "string", maxLength: 32 },
                        { type: "null" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      validate: (value) => {
        const parsed = parseGeneratedQuestionnaireBatch(
          value,
          islands satisfies readonly QuestionnaireGenerationIsland[],
        );
        return parsed === null
          ? {
              success: false as const,
              error: new Error("The generated questionnaires were invalid."),
            }
          : { success: true as const, value: parsed };
      },
    },
  );

const questionnairePrompt = (islands: readonly GenerationIsland[]) => `
Create one personalized daily check-in questionnaire for every Mindland island below. Use the onboarding conversation as private context and ground every questionnaire in that island's name, purpose, and source context.

Each questionnaire must contain three to seven short questions. Include at least one question about supportive progress and at least one gentle question about difficulty, friction, or behavior that worked against the island. Ask only about the current day. Avoid judgmental language, assumptions, duplicate questions, and vague generic wellness prompts.

Choose the most natural input kind for each question:
- choice: provide two to five short, mutually exclusive options; placeholder and unit must be null.
- text: options must be empty; provide a short placeholder; unit should be null.
- number: options must be empty; provide a numeric placeholder and a concise unit when useful.
- time: options must be empty; provide a time placeholder such as 22:30; unit should be null.

Return each exact islandKey once. The app creates stable question IDs after generation.

Islands:
${JSON.stringify(
  islands.map((island) => ({
    islandKey: island.islandKey,
    name: island.name,
    purpose: island.purpose,
    sourceContext: island.sourceContext,
  })),
  null,
  2,
)}
`.trim();

export async function generateQuestionnaires(
  ctx: ActionCtx,
  claim: {
    ownerTokenIdentifier: string;
    threadId: string;
    islands: GenerationIsland[];
  },
): Promise<
  Array<{
    islandId: Id<"islands">;
    source: "agent" | "fallback";
    questions: IslandQuestion[];
  }>
> {
  try {
    const result = await onboardingAgent.generateObject(
      ctx,
      {
        threadId: claim.threadId,
        userId: claim.ownerTokenIdentifier,
      },
      {
        prompt: questionnairePrompt(claim.islands),
        schema: generatedBatchSchema(claim.islands),
        schemaName: "MindlandIslandQuestionnaires",
        schemaDescription:
          "Personalized daily questionnaires for every newly created island.",
        providerOptions: {
          openai: { reasoningEffort: "low", store: false },
        },
      },
      {
        contextOptions: { recentMessages: 30 },
        storageOptions: { saveMessages: "none" },
      },
    );
    const byIslandKey = new Map(
      result.object.questionnaires.map((questionnaire) => [
        questionnaire.islandKey,
        questionnaire.questions,
      ]),
    );
    return claim.islands.map((island) => ({
      islandId: island.id,
      source: "agent" as const,
      questions: materializeGeneratedQuestions(
        island.id,
        byIslandKey.get(island.islandKey)!,
      ),
    }));
  } catch (error) {
    logSafeFailure("Island questionnaire generation failed", error);
    return claim.islands.map((island) => ({
      islandId: island.id,
      source: "fallback" as const,
      questions: createFallbackIslandQuestionnaire(island),
    }));
  }
}

export const loadForInterview = internalQuery({
  args: {
    interviewId: v.id("onboardingInterviews"),
    ownerTokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      islands: v.array(generationIslandValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(args.interviewId);
    if (
      interview === null ||
      interview.ownerTokenIdentifier !== args.ownerTokenIdentifier
    ) {
      return null;
    }
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_source_interview", (index) =>
        index.eq("source.interviewId", interview._id),
      )
      .collect();
    return {
      ownerTokenIdentifier: args.ownerTokenIdentifier,
      threadId: interview.threadId,
      islands: islands
        .filter((island) => island.questionnaire === undefined)
        .map((island) => ({
          id: island._id,
          islandKey: island.islandKey,
          name: island.name,
          purpose: island.purpose,
          sourceContext: island.source.context,
          visualThemeKey: island.visualThemeKey,
        })),
    };
  },
});

export const loadMissingMine = internalQuery({
  args: { ownerTokenIdentifier: v.string() },
  returns: v.array(
    v.object({
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      islands: v.array(generationIslandValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", args.ownerTokenIdentifier),
      )
      .collect();
    const missing = islands.filter(
      (island) => island.questionnaire === undefined,
    );
    const islandsByInterview = new Map<
      Id<"onboardingInterviews">,
      typeof missing
    >();
    for (const island of missing) {
      const grouped = islandsByInterview.get(island.source.interviewId) ?? [];
      grouped.push(island);
      islandsByInterview.set(island.source.interviewId, grouped);
    }
    const claims = [];
    for (const [interviewId, groupedIslands] of islandsByInterview) {
      const interview = await ctx.db.get(interviewId);
      if (
        interview === null ||
        interview.ownerTokenIdentifier !== args.ownerTokenIdentifier
      ) {
        continue;
      }
      claims.push({
        ownerTokenIdentifier: args.ownerTokenIdentifier,
        threadId: interview.threadId,
        islands: groupedIslands.map((island) => ({
          id: island._id,
          islandKey: island.islandKey,
          name: island.name,
          purpose: island.purpose,
          sourceContext: island.source.context,
          visualThemeKey: island.visualThemeKey,
        })),
      });
    }
    return claims;
  },
});

export const applyQuestionnaires = internalMutation({
  args: {
    ownerTokenIdentifier: v.string(),
    revealInterviewId: v.optional(v.id("onboardingInterviews")),
    questionnaires: v.array(generatedQuestionnaireValidator),
  },
  returns: v.object({
    interviewId: v.union(v.id("onboardingInterviews"), v.null()),
    islandNames: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const generated of args.questionnaires) {
      const island = await ctx.db.get(generated.islandId);
      if (
        island === null ||
        island.ownerTokenIdentifier !== args.ownerTokenIdentifier
      ) {
        throw new ConvexError({
          code: "ISLAND_NOT_FOUND",
          message: "That island is unavailable.",
        });
      }
      if (island.questionnaire === undefined) {
        await ctx.db.patch(island._id, {
          questionnaire: generated.questions,
          questionnaireSource: generated.source,
          questionnaireGeneratedAt: now,
          updatedAt: now,
        });
      }
    }
    if (args.revealInterviewId === undefined) {
      return { interviewId: null, islandNames: [] };
    }
    const interview = await ctx.db.get(args.revealInterviewId);
    if (
      interview === null ||
      interview.ownerTokenIdentifier !== args.ownerTokenIdentifier
    ) {
      throw new ConvexError({
        code: "INTERVIEW_NOT_FOUND",
        message: "That interview is unavailable.",
      });
    }
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_source_interview", (index) =>
        index.eq("source.interviewId", interview._id),
      )
      .collect();
    if (
      islands.length === 0 ||
      islands.some((island) => island.questionnaire === undefined)
    ) {
      throw new Error("Every island needs a questionnaire before reveal.");
    }
    if (interview.status === "readyToCreate") {
      await ctx.db.patch(interview._id, {
        status: "revealed",
        candidateNamesRevealedAt:
          interview.candidateNamesRevealedAt ?? now,
        islandsMaterializedAt: interview.islandsMaterializedAt ?? now,
        updatedAt: now,
      });
    }
    return {
      interviewId: interview._id,
      islandNames: islands.map((island) => island.name),
    };
  },
});
