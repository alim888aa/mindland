import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  privateProofRecords: defineTable({
    ownerTokenIdentifier: v.string(),
    value: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerTokenIdentifier"]),
});
