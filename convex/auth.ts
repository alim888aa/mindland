import { ConvexError } from "convex/values";

import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

type AuthenticatedContext = Pick<ActionCtx | MutationCtx | QueryCtx, "auth">;

export async function requireOwnerTokenIdentifier(
  ctx: AuthenticatedContext,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in before accessing private Mindland data.",
    });
  }

  return identity.tokenIdentifier;
}
