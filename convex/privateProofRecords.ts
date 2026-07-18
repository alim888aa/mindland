import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("privateProofRecords"),
      _creationTime: v.number(),
      value: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const records = await ctx.db
      .query("privateProofRecords")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .collect();

    return records.map(({ ownerTokenIdentifier: _owner, ...record }) => record);
  },
});

export const saveMine = mutation({
  args: {
    value: v.string(),
  },
  returns: v.id("privateProofRecords"),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const now = Date.now();

    return await ctx.db.insert("privateProofRecords", {
      ownerTokenIdentifier,
      value: args.value,
      createdAt: now,
      updatedAt: now,
    });
  },
});
