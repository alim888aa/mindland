import { jsonSchema } from "ai";

import type { ActionCtx } from "./_generated/server";
import { dailyCheckInAgent } from "./checkInAgent";
import {
  parseCheckInCompletionDecision,
  type CheckInCompletionDecision,
} from "./checkInCompletionPolicy";

const completionSchema = jsonSchema<CheckInCompletionDecision>(
  {
    type: "object",
    additionalProperties: false,
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: ["collecting", "awaitingConfirmation", "complete"],
      },
    },
  },
  {
    validate: (value) => {
      const result = parseCheckInCompletionDecision(value);
      if (!result.success) return result;

      switch (result.value.status) {
        case "collecting":
          return { success: true, value: { status: "collecting" } };
        case "awaitingConfirmation":
          return { success: true, value: { status: "awaitingConfirmation" } };
        case "complete":
          return { success: true, value: { status: "complete" } };
        default:
          return {
            success: false,
            error: new Error("The check-in completion decision was invalid."),
          };
      }
    },
  },
);

const completionPrompt = `
Privately classify the daily check-in conversation after the latest assistant reply.

Return collecting while the assistant is still learning about the day and has not asked the final “anything else?” question.

Return awaitingConfirmation when the assistant has just asked whether there is anything else, or when the user's intent to finish is ambiguous.

Return complete only when the assistant had already asked whether there was anything else in an earlier message, the user then clearly confirmed there was nothing more to add, and the latest assistant reply is a final acknowledgement without another question.

This is private workflow metadata. Do not summarize, score, or reinterpret activities.
`.trim();

export async function classifyCheckInCompletion(
  ctx: ActionCtx,
  options: {
    threadId: string;
    ownerTokenIdentifier: string;
  },
) {
  const result = await dailyCheckInAgent.generateObject(
    ctx,
    {
      threadId: options.threadId,
      userId: options.ownerTokenIdentifier,
    },
    {
      prompt: completionPrompt,
      schema: completionSchema,
      schemaName: "MindlandCheckInCompletion",
      schemaDescription:
        "The private conversational completion state for today's check-in.",
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          store: false,
        },
      },
    },
    {
      contextOptions: {
        recentMessages: 40,
      },
      storageOptions: {
        saveMessages: "none",
      },
    },
  );

  return result.object;
}
