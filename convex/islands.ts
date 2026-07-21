import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";
import { islandVisualThemeKeyValidator } from "./islandCatalogue";
import { islandQuestionValidator } from "./islandQuestionnaireValues";

const ownedIsland = v.object({
  id: v.id("islands"),
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
  questionnaire: v.union(v.array(islandQuestionValidator), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const listMine = query({
  args: {},
  returns: v.array(ownedIsland),
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("asc")
      .collect();

    return islands.map((island) => ({
      id: island._id,
      islandKey: island.islandKey,
      name: island.name,
      purpose: island.purpose,
      source: island.source,
      visualThemeKey: island.visualThemeKey,
      visualSeed: island.visualSeed,
      questionnaire: island.questionnaire ?? null,
      createdAt: island.createdAt,
      updatedAt: island.updatedAt,
    }));
  },
});
