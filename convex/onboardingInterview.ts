import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { requireOwnerTokenIdentifier } from "./auth";
import {
  fallbackVisualThemeKey,
  islandVisualThemeKeyValidator,
} from "./islandCatalogue";
import {
  materializeIslandInputs,
  missingMaterializedIslandInputs,
} from "./islandMaterialization";
import { onboardingAgent, onboardingOpeningMessage } from "./onboardingAgent";

const interviewStatus = v.union(
  v.literal("interviewing"),
  v.literal("readyToCreate"),
  v.literal("revealed"),
  v.literal("completed"),
);

const generationState = v.union(
  v.literal("idle"),
  v.literal("queued"),
  v.literal("streaming"),
  v.literal("failed"),
);

const submissionStatus = v.union(
  v.literal("queued"),
  v.literal("streaming"),
  v.literal("completed"),
  v.literal("failed"),
);

const publicInterviewState = v.object({
  interviewId: v.id("onboardingInterviews"),
  threadId: v.string(),
  status: interviewStatus,
  generationState,
  progressPercent: v.number(),
  candidates: v.object({
    count: v.number(),
    names: v.array(v.string()),
    revealed: v.boolean(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const submissionReceipt = v.object({
  submissionId: v.id("onboardingSubmissions"),
  clientRequestId: v.string(),
  promptMessageId: v.string(),
  status: submissionStatus,
  attempts: v.number(),
  errorMessage: v.union(v.string(), v.null()),
  accepted: v.boolean(),
});

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

const staleQueuedThresholdMs = 2 * 60 * 1_000;
const staleStreamingThresholdMs = 15 * 60 * 1_000;

function textHash(text: string) {
  let hash = 2_166_136_261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stateForClient(interview: Doc<"onboardingInterviews">) {
  const revealed = interview.candidateNamesRevealedAt !== undefined;

  return {
    interviewId: interview._id,
    threadId: interview.threadId,
    status: interview.status,
    generationState: interview.generationState,
    progressPercent: interview.progressPercent,
    candidates: {
      count: interview.candidateIslandNames.length,
      names: revealed ? interview.candidateIslandNames : [],
      revealed,
    },
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}

function receiptForClient(
  submission: Doc<"onboardingSubmissions">,
  accepted: boolean,
) {
  return {
    submissionId: submission._id,
    clientRequestId: submission.clientRequestId,
    promptMessageId: submission.promptMessageId,
    status: submission.status,
    attempts: submission.attempts,
    errorMessage: submission.errorMessage ?? null,
    accepted,
  };
}

async function requireOwnedInterview(
  ctx: DatabaseContext,
  interviewId: Id<"onboardingInterviews">,
  ownerTokenIdentifier: string,
) {
  const interview = await ctx.db.get(interviewId);

  if (
    interview === null ||
    interview.ownerTokenIdentifier !== ownerTokenIdentifier
  ) {
    throw new ConvexError({
      code: "INTERVIEW_NOT_FOUND",
      message: "That interview is unavailable.",
    });
  }

  return interview;
}

async function requireOwnedThread(
  ctx: DatabaseContext,
  threadId: string,
  ownerTokenIdentifier: string,
) {
  const interview = await ctx.db
    .query("onboardingInterviews")
    .withIndex("by_thread", (index) => index.eq("threadId", threadId))
    .unique();

  if (
    interview === null ||
    interview.ownerTokenIdentifier !== ownerTokenIdentifier
  ) {
    throw new ConvexError({
      code: "INTERVIEW_NOT_FOUND",
      message: "That interview is unavailable.",
    });
  }

  return interview;
}

async function findSubmission(
  ctx: DatabaseContext,
  ownerTokenIdentifier: string,
  interviewId: Id<"onboardingInterviews">,
  clientRequestId: string,
) {
  return await ctx.db
    .query("onboardingSubmissions")
    .withIndex("by_owner_interview_request", (index) =>
      index
        .eq("ownerTokenIdentifier", ownerTokenIdentifier)
        .eq("interviewId", interviewId)
        .eq("clientRequestId", clientRequestId),
    )
    .unique();
}

export const startOrResume = mutation({
  args: {},
  returns: publicInterviewState,
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("onboardingInterviews")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("desc")
      .first();

    if (existing !== null) {
      return stateForClient(existing);
    }

    const { threadId } = await onboardingAgent.createThread(ctx, {
      userId: ownerTokenIdentifier,
      title: "First map interview",
    });

    await onboardingAgent.saveMessage(ctx, {
      threadId,
      userId: ownerTokenIdentifier,
      message: {
        role: "assistant",
        content: onboardingOpeningMessage,
      },
      skipEmbeddings: true,
    });

    const now = Date.now();
    const interviewId = await ctx.db.insert("onboardingInterviews", {
      ownerTokenIdentifier,
      threadId,
      status: "interviewing",
      generationState: "idle",
      progressPercent: 0,
      candidateIslandNames: [],
      createdAt: now,
      updatedAt: now,
    });
    const interview = await ctx.db.get(interviewId);

    if (interview === null) {
      throw new Error("The onboarding interview could not be created.");
    }

    return stateForClient(interview);
  },
});

export const getCurrent = query({
  args: {},
  returns: v.union(publicInterviewState, v.null()),
  handler: async (ctx) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const interview = await ctx.db
      .query("onboardingInterviews")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("desc")
      .first();

    return interview === null ? null : stateForClient(interview);
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    await requireOwnedThread(ctx, args.threadId, ownerTokenIdentifier);

    const messages = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);

    return { ...messages, streams };
  },
});

export const submitAnswer = mutation({
  args: {
    interviewId: v.id("onboardingInterviews"),
    clientRequestId: v.string(),
    text: v.string(),
  },
  returns: submissionReceipt,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const interview = await requireOwnedInterview(
      ctx,
      args.interviewId,
      ownerTokenIdentifier,
    );
    const clientRequestId = args.clientRequestId.trim();
    const text = args.text.trim();

    if (clientRequestId.length === 0 || clientRequestId.length > 128) {
      throw new ConvexError({
        code: "INVALID_REQUEST_ID",
        message: "This message needs a valid request identifier.",
      });
    }

    if (text.length === 0 || text.length > 4_000) {
      throw new ConvexError({
        code: "INVALID_MESSAGE",
        message: "Write between 1 and 4,000 characters.",
      });
    }

    const existing = await findSubmission(
      ctx,
      ownerTokenIdentifier,
      args.interviewId,
      clientRequestId,
    );

    if (existing !== null) {
      if (existing.requestTextHash !== textHash(text)) {
        throw new ConvexError({
          code: "REQUEST_ID_REUSED",
          message:
            "This request identifier already belongs to another message.",
        });
      }

      return receiptForClient(existing, false);
    }

    if (
      interview.status !== "interviewing" &&
      interview.status !== "readyToCreate"
    ) {
      throw new ConvexError({
        code: "INTERVIEW_FINISHED",
        message: "This interview is already finished.",
      });
    }

    if (interview.generationState !== "idle") {
      throw new ConvexError({
        code: "INTERVIEW_BUSY",
        message: "Wait for the current reply or retry the failed message.",
      });
    }

    const { messageId: promptMessageId } = await onboardingAgent.saveMessage(
      ctx,
      {
        threadId: interview.threadId,
        userId: ownerTokenIdentifier,
        prompt: text,
        skipEmbeddings: true,
      },
    );
    const now = Date.now();
    const submissionId = await ctx.db.insert("onboardingSubmissions", {
      ownerTokenIdentifier,
      interviewId: interview._id,
      clientRequestId,
      requestTextHash: textHash(text),
      promptMessageId,
      status: "queued",
      attempts: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      status: "interviewing",
      generationState: "queued",
      activeSubmissionId: submissionId,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.onboardingInterviewGeneration.generateReply,
      { submissionId, attempt: 1 },
    );
    await ctx.scheduler.runAfter(
      staleQueuedThresholdMs,
      internal.onboardingInterview.expireGeneration,
      {
        submissionId,
        attempt: 1,
        expectedState: "queued",
      },
    );
    const submission = await ctx.db.get(submissionId);

    if (submission === null) {
      throw new Error("The onboarding answer could not be queued.");
    }

    return receiptForClient(submission, true);
  },
});

export const retryAnswer = mutation({
  args: {
    interviewId: v.id("onboardingInterviews"),
  },
  returns: submissionReceipt,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const interview = await requireOwnedInterview(
      ctx,
      args.interviewId,
      ownerTokenIdentifier,
    );
    const submission = interview.activeSubmissionId
      ? await ctx.db.get(interview.activeSubmissionId)
      : null;

    if (
      submission === null ||
      submission.ownerTokenIdentifier !== ownerTokenIdentifier ||
      submission.interviewId !== interview._id
    ) {
      throw new ConvexError({
        code: "SUBMISSION_NOT_FOUND",
        message: "That message is unavailable.",
      });
    }

    const staleAge = Date.now() - submission.updatedAt;
    const stale =
      (submission.status === "queued" && staleAge >= staleQueuedThresholdMs) ||
      (submission.status === "streaming" &&
        staleAge >= staleStreamingThresholdMs);

    if (submission.status !== "failed" && !stale) {
      return receiptForClient(submission, false);
    }

    if (
      (interview.generationState !== "failed" && !stale) ||
      interview.activeSubmissionId !== submission._id
    ) {
      throw new ConvexError({
        code: "INTERVIEW_BUSY",
        message: "Another reply is already in progress.",
      });
    }

    const now = Date.now();
    const attempt = submission.attempts + 1;
    await ctx.db.patch(submission._id, {
      status: "queued",
      attempts: attempt,
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      generationState: "queued",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.onboardingInterviewGeneration.generateReply,
      { submissionId: submission._id, attempt },
    );
    await ctx.scheduler.runAfter(
      staleQueuedThresholdMs,
      internal.onboardingInterview.expireGeneration,
      {
        submissionId: submission._id,
        attempt,
        expectedState: "queued",
      },
    );
    const queued = await ctx.db.get(submission._id);

    if (queued === null) {
      throw new Error("The onboarding answer could not be retried.");
    }

    return receiptForClient(queued, true);
  },
});

export const getSubmission = query({
  args: {
    interviewId: v.id("onboardingInterviews"),
    clientRequestId: v.string(),
  },
  returns: v.union(submissionReceipt, v.null()),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    await requireOwnedInterview(ctx, args.interviewId, ownerTokenIdentifier);
    const submission = await findSubmission(
      ctx,
      ownerTokenIdentifier,
      args.interviewId,
      args.clientRequestId.trim(),
    );

    return submission === null ? null : receiptForClient(submission, false);
  },
});

export const revealCandidateNames = mutation({
  args: {
    interviewId: v.id("onboardingInterviews"),
  },
  returns: publicInterviewState,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const interview = await requireOwnedInterview(
      ctx,
      args.interviewId,
      ownerTokenIdentifier,
    );

    if (
      interview.status !== "readyToCreate" &&
      interview.status !== "revealed" &&
      interview.status !== "completed"
    ) {
      throw new ConvexError({
        code: "INTERVIEW_NOT_READY",
        message: "Keep chatting before creating this map.",
      });
    }

    if (interview.candidateIslandNames.length === 0) {
      throw new ConvexError({
        code: "INTERVIEW_NOT_READY",
        message: "Keep chatting before creating this map.",
      });
    }

    const now = Date.now();
    const candidates =
      interview.candidateIslands ??
      interview.candidateIslandNames.map((name) => ({
        name,
        purpose: `Grow and care for ${name}.`,
        sourceContext: `Discovered during the onboarding interview as ${name}.`,
        visualThemeKey: fallbackVisualThemeKey(name),
      }));
    const islandInputs = materializeIslandInputs(interview._id, candidates);
    const existingIslands = await ctx.db
      .query("islands")
      .withIndex("by_source_interview", (index) =>
        index.eq("source.interviewId", interview._id),
      )
      .collect();
    const missingIslands = missingMaterializedIslandInputs(
      islandInputs,
      new Set(existingIslands.map((island) => island.islandKey)),
    );

    for (const island of missingIslands) {
      const { sourceContext, ...storedIsland } = island;
      await ctx.db.insert("islands", {
        ownerTokenIdentifier,
        ...storedIsland,
        source: {
          kind: "onboarding",
          interviewId: interview._id,
          context: sourceContext,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    if (interview.status === "revealed" || interview.status === "completed") {
      if (
        missingIslands.length > 0 ||
        interview.islandsMaterializedAt === undefined
      ) {
        await ctx.db.patch(interview._id, {
          islandsMaterializedAt: interview.islandsMaterializedAt ?? now,
          updatedAt: missingIslands.length > 0 ? now : interview.updatedAt,
        });
        const repaired = await ctx.db.get(interview._id);
        if (repaired === null) {
          throw new Error("The onboarding interview could not be repaired.");
        }
        return stateForClient(repaired);
      }
      return stateForClient(interview);
    }

    await ctx.db.patch(interview._id, {
      islandsMaterializedAt: interview.islandsMaterializedAt ?? now,
      updatedAt: now,
    });
    const revealed = await ctx.db.get(interview._id);

    if (revealed === null) {
      throw new Error("The onboarding interview could not be revealed.");
    }

    return stateForClient(revealed);
  },
});

export const claimGeneration = internalMutation({
  args: {
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
  },
  returns: v.union(
    v.object({
      interviewId: v.id("onboardingInterviews"),
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      promptMessageId: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (
      submission === null ||
      submission.status !== "queued" ||
      submission.attempts !== args.attempt
    ) {
      return null;
    }

    const interview = await ctx.db.get(submission.interviewId);

    if (
      interview === null ||
      interview.activeSubmissionId !== submission._id ||
      interview.generationState !== "queued" ||
      interview.ownerTokenIdentifier !== submission.ownerTokenIdentifier
    ) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "streaming",
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      generationState: "streaming",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      staleStreamingThresholdMs,
      internal.onboardingInterview.expireGeneration,
      {
        submissionId: submission._id,
        attempt: args.attempt,
        expectedState: "streaming",
      },
    );

    return {
      interviewId: interview._id,
      ownerTokenIdentifier: interview.ownerTokenIdentifier,
      threadId: interview.threadId,
      promptMessageId: submission.promptMessageId,
    };
  },
});

export const completeGeneration = internalMutation({
  args: {
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (
      submission === null ||
      submission.status !== "streaming" ||
      submission.attempts !== args.attempt
    ) {
      return null;
    }

    const interview = await ctx.db.get(submission.interviewId);

    if (interview === null || interview.activeSubmissionId !== submission._id) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "completed",
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      generationState: "idle",
      activeSubmissionId: undefined,
      updatedAt: now,
    });

    return null;
  },
});

export const failGeneration = internalMutation({
  args: {
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);

    if (
      submission === null ||
      submission.attempts !== args.attempt ||
      (submission.status !== "streaming" && submission.status !== "queued")
    ) {
      return null;
    }

    const interview = await ctx.db.get(submission.interviewId);

    if (interview === null || interview.activeSubmissionId !== submission._id) {
      return null;
    }

    const now = Date.now();
    const errorMessage = "Mindland couldn't finish that reply. Please retry.";
    await ctx.db.patch(submission._id, {
      status: "failed",
      errorMessage,
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      generationState: "failed",
      updatedAt: now,
    });

    return null;
  },
});

export const expireGeneration = internalMutation({
  args: {
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
    expectedState: v.union(v.literal("queued"), v.literal("streaming")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    const threshold =
      args.expectedState === "queued"
        ? staleQueuedThresholdMs
        : staleStreamingThresholdMs;

    if (
      submission === null ||
      submission.status !== args.expectedState ||
      submission.attempts !== args.attempt ||
      Date.now() - submission.updatedAt < threshold
    ) {
      return null;
    }

    const interview = await ctx.db.get(submission.interviewId);

    if (
      interview === null ||
      interview.activeSubmissionId !== submission._id ||
      interview.generationState !== args.expectedState
    ) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "failed",
      errorMessage: "Mindland's reply was interrupted. Please retry.",
      updatedAt: now,
    });
    await ctx.db.patch(interview._id, {
      generationState: "failed",
      updatedAt: now,
    });

    return null;
  },
});

export const applyDiscoveryState = internalMutation({
  args: {
    interviewId: v.id("onboardingInterviews"),
    submissionId: v.id("onboardingSubmissions"),
    attempt: v.number(),
    ownerTokenIdentifier: v.string(),
    progressPercent: v.number(),
    candidateIslands: v.array(
      v.object({
        name: v.string(),
        purpose: v.string(),
        sourceContext: v.string(),
        visualThemeKey: islandVisualThemeKeyValidator,
      }),
    ),
    readyToCreate: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const interview = await requireOwnedInterview(
      ctx,
      args.interviewId,
      args.ownerTokenIdentifier,
    );
    const submission = await ctx.db.get(args.submissionId);

    if (
      submission === null ||
      submission.interviewId !== interview._id ||
      submission.ownerTokenIdentifier !== args.ownerTokenIdentifier ||
      submission.status !== "streaming" ||
      submission.attempts !== args.attempt ||
      interview.activeSubmissionId !== submission._id
    ) {
      return null;
    }
    const seenNames = new Set<string>();
    const candidateIslands = args.candidateIslands
      .map((island) => ({
        ...island,
        name: island.name.trim(),
        purpose: island.purpose.trim(),
        sourceContext: island.sourceContext.trim(),
      }))
      .filter((island) => {
        const normalizedName = island.name.toLocaleLowerCase();
        if (island.name.length === 0 || seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
      })
      .slice(0, 8);
    const candidateIslandNames = candidateIslands.map((island) => island.name);
    const requestedProgress = Math.max(
      0,
      Math.min(100, Math.round(args.progressPercent)),
    );
    const progressPercent = Math.max(
      interview.progressPercent,
      requestedProgress,
    );
    const readyToCreate = args.readyToCreate && candidateIslandNames.length > 0;

    await ctx.db.patch(interview._id, {
      status: readyToCreate ? "readyToCreate" : "interviewing",
      progressPercent,
      candidateIslandNames,
      candidateIslands,
      updatedAt: Date.now(),
    });

    return null;
  },
});
