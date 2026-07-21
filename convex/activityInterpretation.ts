import { jsonSchema } from "ai";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { dailyCheckInAgent } from "./checkInAgent";
import {
  islandDetailKeys,
  type IslandDetailKey,
} from "./islandVisualDetails";
import { logSafeFailure } from "./safeErrorLog";
import {
  parseCheckInActivityInterpretation,
  prepareActivityApplicationInput,
  type CheckInActivityInterpretation,
} from "../src/domain/check-in-activity-interpretation";

export function interpretationPrompt(
  islands: ReadonlyArray<{ id: Id<"islands">; name: string; purpose: string }>,
  userMessages: ReadonlyArray<{ messageId: string; text: string }>,
) {
  const islandContext = islands
    .map((island) => `${island.id} | ${island.name} | ${island.purpose}`)
    .join("\n");
  const messageContext = userMessages
    .map((message) => `${message.messageId} | ${JSON.stringify(message.text)}`)
    .join("\n");

  return `
Privately interpret the completed daily check-in into structured activities.

Create a separate activity when the person described a distinct thing they did or experienced today. Preserve uncertainty: use null for duration or time when the person did not say. Do not treat the final confirmation that they are done as an activity. Do not invent activity, duration, time, sentiment, tags, or island relationships.

Every activity must cite one or more exact sourceMessageIds from the allowed user messages below. A later system will copy the original text directly from those messages, so never invent an id.

Map an activity only to the most specific owned island or islands it genuinely affects. One activity may affect several islands. supportive means it moved that island's purpose forward. harmful means it worked against that purpose. both is allowed when the same activity clearly did both. Do not award supportive credit merely for discussing, planning, or wanting something.

For every supportive or both effect, choose exactly one positiveDetailKey from this approved catalogue: ${islandDetailKeys.join(", ")}. Choose the closest semantic detail. For a harmful-only effect, positiveDetailKey must be null. These keys describe a small visual marker only; score arithmetic happens elsewhere.

Owned islands (id | name | purpose):
${islandContext || "No owned islands."}

Allowed user messages (message id | exact text):
${messageContext || "No user activity messages."}

Return only private structured metadata.
  `.trim();
}

export function activityInterpretationSchema(options: {
  ownedIslandIds: ReadonlySet<string>;
  userMessageIds: ReadonlySet<string>;
}) {
  return jsonSchema<CheckInActivityInterpretation>(
    {
      type: "object",
      additionalProperties: false,
      required: ["activities"],
      properties: {
        activities: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "activity",
              "durationMinutes",
              "time",
              "sentiment",
              "tags",
              "sourceMessageIds",
              "islandEffects",
            ],
            properties: {
              activity: { type: "string", minLength: 1, maxLength: 240 },
              durationMinutes: {
                anyOf: [
                  { type: "number", minimum: 0, maximum: 1_440 },
                  { type: "null" },
                ],
              },
              time: {
                anyOf: [
                  { type: "string", maxLength: 40 },
                  { type: "null" },
                ],
              },
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative", "mixed"],
              },
              tags: {
                type: "array",
                maxItems: 10,
                items: { type: "string", minLength: 1, maxLength: 40 },
              },
              sourceMessageIds: {
                type: "array",
                minItems: 1,
                maxItems: 12,
                items: { type: "string", minLength: 1 },
              },
              islandEffects: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["islandId", "effect", "positiveDetailKey"],
                  properties: {
                    islandId: { type: "string", minLength: 1 },
                    effect: {
                      type: "string",
                      enum: ["supportive", "harmful", "both"],
                    },
                    positiveDetailKey: {
                      anyOf: [
                        { type: "string", enum: [...islandDetailKeys] },
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
      validate: (value) => parseCheckInActivityInterpretation(value, options),
    },
  );
}

export const interpretCompletedCheckIn = internalAction({
  args: { checkInId: v.id("dailyCheckIns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.activityApplication.claimInterpretation,
      { checkInId: args.checkInId },
    );
    if (claim === null) return null;

    try {
      const messages = await dailyCheckInAgent.listMessages(ctx, {
        threadId: claim.threadId,
        paginationOpts: { cursor: null, numItems: 100 },
        excludeToolMessages: true,
        statuses: ["success"],
      });
      const userMessages = messages.page
        .filter(
          (message) =>
            message.message?.role === "user" &&
            typeof message.text === "string" &&
            message.text.trim().length > 0,
        )
        .sort((left, right) =>
          left.order === right.order
            ? left.stepOrder - right.stepOrder
            : left.order - right.order,
        )
        .map((message) => ({
          messageId: message._id,
          text: message.text!.trim(),
        }))
        .filter(
          (message) => !claim.consumedMessageIds.includes(message.messageId),
        );
      const result = await dailyCheckInAgent.generateObject(
        ctx,
        {
          threadId: claim.threadId,
          userId: claim.ownerTokenIdentifier,
        },
        {
          prompt: interpretationPrompt(claim.islands, userMessages),
          schema: activityInterpretationSchema({
            ownedIslandIds: new Set(claim.islands.map((island) => island.id)),
            userMessageIds: new Set(
              userMessages.map((message) => message.messageId),
            ),
          }),
          schemaName: "MindlandDailyActivities",
          schemaDescription:
            "Private grounded activities and their effects on owned islands.",
          providerOptions: {
            openai: {
              reasoningEffort: "low",
              store: false,
            },
          },
        },
        {
          contextOptions: { recentMessages: 40 },
          storageOptions: { saveMessages: "none" },
        },
      );
      const exactMessages = new Map(
        userMessages.map((message) => [message.messageId, message.text]),
      );
      await ctx.runMutation(internal.activityApplication.applyInterpretation, {
        interpretationId: claim.interpretationId,
        attempt: claim.attempt,
        activities: result.object.activities.map((activity) => {
          const applicationInput = prepareActivityApplicationInput(
            activity,
            exactMessages,
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
      logSafeFailure("Daily activity interpretation failed", error);
      await ctx.runMutation(internal.activityApplication.failInterpretation, {
        interpretationId: claim.interpretationId,
        attempt: claim.attempt,
        message: "Mindland couldn't apply today's island changes yet.",
      });
    }

    return null;
  },
});
