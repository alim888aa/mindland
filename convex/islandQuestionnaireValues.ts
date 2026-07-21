import { v } from "convex/values";

const optionalDetail = v.optional(v.string());

export const islandQuestionValidator = v.union(
  v.object({
    id: v.string(),
    prompt: v.string(),
    detail: optionalDetail,
    kind: v.literal("choice"),
    options: v.array(v.string()),
  }),
  v.object({
    id: v.string(),
    prompt: v.string(),
    detail: optionalDetail,
    kind: v.union(v.literal("text"), v.literal("number"), v.literal("time")),
    placeholder: v.string(),
    unit: v.optional(v.string()),
  }),
);

export const islandQuestionnaireSourceValidator = v.union(
  v.literal("agent"),
  v.literal("fallback"),
);
