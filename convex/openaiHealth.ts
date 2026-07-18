import { ConvexError, v } from "convex/values";

import { internalAction } from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";

export const check = internalAction({
  args: {},
  returns: v.object({
    ok: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireOwnerTokenIdentifier(ctx);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({
        code: "MISSING_SERVER_CONFIG",
        message: "The server OpenAI connection has not been configured.",
      });
    }

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new ConvexError({
        code: "OPENAI_UNAVAILABLE",
        message: "The server could not authenticate with OpenAI.",
        status: response.status,
      });
    }

    return { ok: true };
  },
});
