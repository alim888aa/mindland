import {
  abortStream,
  listMessages,
  syncStreams,
  toUIMessages,
  vStreamArgs,
} from "@convex-dev/agent";
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
  type CheckInCompletionDecision,
  resolveCheckInStatus,
} from "./checkInCompletionPolicy";
import { selectMostRecentCompletedCheckIn } from "./checkInContextPolicy";
import {
  boundCheckInForRequest,
  checkInQueuedLeaseMs,
  checkInStreamingLeaseMs,
  isCurrentLocalDate,
  isOwnedCheckIn,
  isSameCheckInRequest,
  localDateForTimeZone,
  normalizeTimeZone,
  retryActionForSubmission,
} from "./checkInPolicy";
import {
  dailyCheckInAgent,
  dailyCheckInOpeningMessage,
} from "./checkInAgent";
import { conversationInterpretationOrNull } from "../src/domain/check-in-interpretation-policy";

const checkInStatus = v.union(
  v.literal("collecting"),
  v.literal("awaitingConfirmation"),
  v.literal("complete"),
);

const unfinishedCheckInStatus = v.union(
  v.literal("collecting"),
  v.literal("awaitingConfirmation"),
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

const publicCheckInState = v.object({
  checkInId: v.id("dailyCheckIns"),
  threadId: v.string(),
  localDate: v.string(),
  timeZone: v.string(),
  usesRequestedTimeZone: v.boolean(),
  status: checkInStatus,
  generationState,
  completedAt: v.union(v.number(), v.null()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const submissionReceipt = v.object({
  submissionId: v.id("checkInSubmissions"),
  clientRequestId: v.string(),
  promptMessageId: v.string(),
  status: submissionStatus,
  attempts: v.number(),
  errorMessage: v.union(v.string(), v.null()),
  accepted: v.boolean(),
});

type DatabaseContext = Pick<QueryCtx | MutationCtx, "db">;

function stateForClient(
  checkIn: Doc<"dailyCheckIns">,
  requestedTimeZone: string,
) {
  return {
    checkInId: checkIn._id,
    threadId: checkIn.threadId,
    localDate: checkIn.localDate,
    timeZone: checkIn.timeZone,
    usesRequestedTimeZone: checkIn.timeZone === requestedTimeZone,
    status: checkIn.status,
    generationState: checkIn.generationState,
    completedAt: checkIn.completedAt ?? null,
    createdAt: checkIn.createdAt,
    updatedAt: checkIn.updatedAt,
  };
}

function receiptForClient(
  submission: Doc<"checkInSubmissions">,
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

function currentDateForTimeZone(timeZone: string) {
  try {
    const normalizedTimeZone = normalizeTimeZone(timeZone);
    return {
      localDate: localDateForTimeZone(normalizedTimeZone),
      timeZone: normalizedTimeZone,
    };
  } catch {
    throw new ConvexError({
      code: "INVALID_TIME_ZONE",
      message: "Mindland needs a valid device time zone for today's check-in.",
    });
  }
}

function requireCurrentCheckIn(checkIn: Doc<"dailyCheckIns">) {
  if (!isCurrentLocalDate(checkIn.localDate, checkIn.timeZone)) {
    throw new ConvexError({
      code: "CHECK_IN_CLOSED",
      message: "That daily check-in has ended. Start today's check-in instead.",
    });
  }
}

async function requireOwnedCheckIn(
  ctx: DatabaseContext,
  checkInId: Id<"dailyCheckIns">,
  ownerTokenIdentifier: string,
) {
  const checkIn = await ctx.db.get(checkInId);

  if (
    checkIn === null ||
    !isOwnedCheckIn(checkIn, ownerTokenIdentifier)
  ) {
    throw new ConvexError({
      code: "CHECK_IN_NOT_FOUND",
      message: "That daily check-in is unavailable.",
    });
  }

  return checkIn;
}

async function requireOwnedThread(
  ctx: DatabaseContext,
  threadId: string,
  ownerTokenIdentifier: string,
) {
  const checkIn = await ctx.db
    .query("dailyCheckIns")
    .withIndex("by_thread", (index) => index.eq("threadId", threadId))
    .unique();

  if (!isOwnedCheckIn(checkIn, ownerTokenIdentifier)) {
    throw new ConvexError({
      code: "CHECK_IN_NOT_FOUND",
      message: "That daily check-in is unavailable.",
    });
  }

  return checkIn;
}

async function findSubmission(
  ctx: DatabaseContext,
  ownerTokenIdentifier: string,
  checkInId: Id<"dailyCheckIns">,
  clientRequestId: string,
) {
  return await ctx.db
    .query("checkInSubmissions")
    .withIndex("by_owner_check_in_request", (index) =>
      index
        .eq("ownerTokenIdentifier", ownerTokenIdentifier)
        .eq("checkInId", checkInId)
        .eq("clientRequestId", clientRequestId),
    )
    .unique();
}

async function queueSubmissionRetry(
  ctx: MutationCtx,
  checkIn: Doc<"dailyCheckIns">,
  submission: Doc<"checkInSubmissions">,
) {
  const now = Date.now();
  const attempt = submission.attempts + 1;
  await ctx.db.patch(submission._id, {
    status: "queued",
    attempts: attempt,
    retryRequestedAt: undefined,
    errorMessage: undefined,
    updatedAt: now,
  });
  await ctx.db.patch(checkIn._id, {
    generationState: "queued",
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(
    0,
    internal.checkInGeneration.generateReply,
    { submissionId: submission._id, attempt },
  );
  await ctx.scheduler.runAfter(
    checkInQueuedLeaseMs,
    internal.checkIn.expireGeneration,
    {
      submissionId: submission._id,
      attempt,
      expectedState: "queued",
    },
  );
  const queued = await ctx.db.get(submission._id);

  if (queued === null) {
    throw new Error("The daily check-in message could not be retried.");
  }

  return queued;
}

export const startOrResumeToday = mutation({
  args: {
    timeZone: v.string(),
  },
  returns: publicCheckInState,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const { localDate, timeZone } = currentDateForTimeZone(args.timeZone);
    const latest = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("desc")
      .first();
    const bound = boundCheckInForRequest(latest);

    if (bound !== null) {
      return stateForClient(bound, timeZone);
    }

    const existing = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_owner_date_time_zone", (index) =>
        index
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("localDate", localDate)
          .eq("timeZone", timeZone),
      )
      .unique();

    if (existing !== null) {
      return stateForClient(existing, timeZone);
    }

    const { threadId } = await dailyCheckInAgent.createThread(ctx, {
      userId: ownerTokenIdentifier,
      title: `Daily check-in · ${localDate}`,
    });

    await dailyCheckInAgent.saveMessage(ctx, {
      threadId,
      userId: ownerTokenIdentifier,
      message: {
        role: "assistant",
        content: dailyCheckInOpeningMessage,
      },
      skipEmbeddings: true,
    });

    const now = Date.now();
    const checkInId = await ctx.db.insert("dailyCheckIns", {
      ownerTokenIdentifier,
      localDate,
      timeZone,
      threadId,
      status: "collecting",
      generationState: "idle",
      createdAt: now,
      updatedAt: now,
    });
    const checkIn = await ctx.db.get(checkInId);

    if (checkIn === null) {
      throw new Error("Today's check-in could not be created.");
    }

    return stateForClient(checkIn, timeZone);
  },
});

export const getToday = query({
  args: {
    timeZone: v.string(),
  },
  returns: v.union(publicCheckInState, v.null()),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const { localDate, timeZone } = currentDateForTimeZone(args.timeZone);
    const latest = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", ownerTokenIdentifier),
      )
      .order("desc")
      .first();
    const bound = boundCheckInForRequest(latest);

    if (bound !== null) {
      return stateForClient(bound, timeZone);
    }

    const checkIn = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_owner_date_time_zone", (index) =>
        index
          .eq("ownerTokenIdentifier", ownerTokenIdentifier)
          .eq("localDate", localDate)
          .eq("timeZone", timeZone),
      )
      .unique();

    return checkIn === null ? null : stateForClient(checkIn, timeZone);
  },
});

export const resumeCompletedToday = mutation({
  args: { checkInId: v.id("dailyCheckIns") },
  returns: publicCheckInState,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await requireOwnedCheckIn(
      ctx,
      args.checkInId,
      ownerTokenIdentifier,
    );
    requireCurrentCheckIn(checkIn);
    if (checkIn.status !== "complete") {
      return stateForClient(checkIn, checkIn.timeZone);
    }
    if (checkIn.generationState !== "idle") {
      throw new ConvexError({
        code: "CHECK_IN_BUSY",
        message: "Mindland is still settling today's check-in.",
      });
    }
    const interpretations = await ctx.db
      .query("checkInInterpretations")
      .withIndex("by_check_in", (index) => index.eq("checkInId", checkIn._id))
      .collect();
    const application = conversationInterpretationOrNull(interpretations);
    if (application?.status !== "applied") {
      throw new ConvexError({
        code: "CHECK_IN_APPLICATION_PENDING",
        message: "Mindland is still applying your previous check-in.",
      });
    }
    const now = Date.now();
    await ctx.db.patch(checkIn._id, {
      status: "collecting",
      completedAt: undefined,
      updatedAt: now,
    });
    const resumed = await ctx.db.get(checkIn._id);
    if (resumed === null) throw new Error("Today's check-in could not resume.");
    return stateForClient(resumed, checkIn.timeZone);
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

    const messageDocuments = await listMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
      statuses: ["success", "pending"],
    });
    const messages = {
      ...messageDocuments,
      page: toUIMessages(messageDocuments.page),
    };
    const streams = await syncStreams(ctx, components.agent, args);

    return { ...messages, streams };
  },
});

export const submitMessage = mutation({
  args: {
    checkInId: v.id("dailyCheckIns"),
    clientRequestId: v.string(),
    text: v.string(),
  },
  returns: submissionReceipt,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await requireOwnedCheckIn(
      ctx,
      args.checkInId,
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
      checkIn._id,
      clientRequestId,
    );

    if (existing !== null) {
      if (existing.requestText === undefined) {
        throw new ConvexError({
          code: "LEGACY_REQUEST_ID",
          message:
            "That older request cannot be compared exactly. Send it with a new request identifier.",
        });
      }

      if (!isSameCheckInRequest(existing, text)) {
        throw new ConvexError({
          code: "REQUEST_ID_REUSED",
          message: "This request identifier already belongs to another message.",
        });
      }

      return receiptForClient(existing, false);
    }

    requireCurrentCheckIn(checkIn);

    if (checkIn.status === "complete") {
      throw new ConvexError({
        code: "CHECK_IN_FINISHED",
        message: "Today's check-in is already complete.",
      });
    }

    if (checkIn.generationState !== "idle") {
      throw new ConvexError({
        code: "CHECK_IN_BUSY",
        message: "Wait for the current reply or retry the failed message.",
      });
    }

    const { messageId: promptMessageId, message: promptMessage } =
      await dailyCheckInAgent.saveMessage(ctx, {
        threadId: checkIn.threadId,
        userId: ownerTokenIdentifier,
        prompt: text,
        skipEmbeddings: true,
      });
    const now = Date.now();
    const submissionId = await ctx.db.insert("checkInSubmissions", {
      ownerTokenIdentifier,
      checkInId: checkIn._id,
      clientRequestId,
      requestText: text,
      promptMessageId,
      promptOrder: promptMessage.order,
      statusBeforeReply: checkIn.status,
      status: "queued",
      attempts: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(checkIn._id, {
      generationState: "queued",
      activeSubmissionId: submissionId,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.checkInGeneration.generateReply,
      { submissionId, attempt: 1 },
    );
    await ctx.scheduler.runAfter(
      checkInQueuedLeaseMs,
      internal.checkIn.expireGeneration,
      {
        submissionId,
        attempt: 1,
        expectedState: "queued",
      },
    );
    const submission = await ctx.db.get(submissionId);

    if (submission === null) {
      throw new Error("The daily check-in message could not be queued.");
    }

    return receiptForClient(submission, true);
  },
});

export const retryMessage = mutation({
  args: {
    checkInId: v.id("dailyCheckIns"),
  },
  returns: submissionReceipt,
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    const checkIn = await requireOwnedCheckIn(
      ctx,
      args.checkInId,
      ownerTokenIdentifier,
    );
    requireCurrentCheckIn(checkIn);
    const submission = checkIn.activeSubmissionId
      ? await ctx.db.get(checkIn.activeSubmissionId)
      : null;

    if (
      submission === null ||
      submission.ownerTokenIdentifier !== ownerTokenIdentifier ||
      submission.checkInId !== checkIn._id
    ) {
      throw new ConvexError({
        code: "SUBMISSION_NOT_FOUND",
        message: "That message is unavailable.",
      });
    }

    const staleAge = Date.now() - submission.updatedAt;
    const stale =
      (submission.status === "queued" && staleAge >= checkInQueuedLeaseMs) ||
      (submission.status === "streaming" &&
        staleAge >= checkInStreamingLeaseMs);
    const retryAction = retryActionForSubmission({
      status: submission.status,
      stale,
      retryAlreadyRequested: submission.retryRequestedAt !== undefined,
    });

    if (retryAction === "wait") {
      return receiptForClient(submission, false);
    }

    if (
      checkIn.activeSubmissionId !== submission._id
    ) {
      throw new ConvexError({
        code: "CHECK_IN_BUSY",
        message: "Another reply is already in progress.",
      });
    }

    if (retryAction === "requestAbort") {
      if (
        checkIn.generationState !== "streaming" ||
        submission.promptOrder === undefined
      ) {
        return receiptForClient(submission, false);
      }

      const now = Date.now();
      await ctx.db.patch(submission._id, {
        retryRequestedAt: now,
        errorMessage: "Stopping the interrupted reply before retrying.",
        updatedAt: now,
      });
      const aborted = await abortStream(ctx, components.agent, {
        threadId: checkIn.threadId,
        order: submission.promptOrder,
        reason: "Mindland retry requested",
      });

      if (!aborted) {
        await ctx.db.patch(submission._id, {
          retryRequestedAt: undefined,
          errorMessage: submission.errorMessage,
          updatedAt: submission.updatedAt,
        });
        return receiptForClient(submission, false);
      }

      const stopping = await ctx.db.get(submission._id);
      if (stopping === null) {
        throw new Error("The daily check-in retry could not be requested.");
      }
      return receiptForClient(stopping, true);
    }

    const generationCanQueue =
      (submission.status === "failed" &&
        checkIn.generationState === "failed") ||
      (submission.status === "queued" &&
        checkIn.generationState === "queued" &&
        stale);

    if (!generationCanQueue) {
      return receiptForClient(submission, false);
    }

    const queued = await queueSubmissionRetry(ctx, checkIn, submission);
    return receiptForClient(queued, true);
  },
});

export const getSubmission = query({
  args: {
    checkInId: v.id("dailyCheckIns"),
    clientRequestId: v.string(),
  },
  returns: v.union(submissionReceipt, v.null()),
  handler: async (ctx, args) => {
    const ownerTokenIdentifier = await requireOwnerTokenIdentifier(ctx);
    await requireOwnedCheckIn(ctx, args.checkInId, ownerTokenIdentifier);
    const submission = await findSubmission(
      ctx,
      ownerTokenIdentifier,
      args.checkInId,
      args.clientRequestId.trim(),
    );

    return submission === null ? null : receiptForClient(submission, false);
  },
});

export const claimGeneration = internalMutation({
  args: {
    submissionId: v.id("checkInSubmissions"),
    attempt: v.number(),
  },
  returns: v.union(
    v.object({
      checkInId: v.id("dailyCheckIns"),
      ownerTokenIdentifier: v.string(),
      threadId: v.string(),
      promptMessageId: v.string(),
      statusBeforeReply: unfinishedCheckInStatus,
      islands: v.array(
        v.object({
          name: v.string(),
          purpose: v.string(),
        }),
      ),
      previousThreadId: v.union(v.string(), v.null()),
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

    const checkIn = await ctx.db.get(submission.checkInId);

    if (
      checkIn === null ||
      checkIn.activeSubmissionId !== submission._id ||
      checkIn.generationState !== "queued" ||
      checkIn.ownerTokenIdentifier !== submission.ownerTokenIdentifier
    ) {
      return null;
    }

    const islands = await ctx.db
      .query("islands")
      .withIndex("by_owner", (index) =>
        index.eq("ownerTokenIdentifier", checkIn.ownerTokenIdentifier),
      )
      .order("asc")
      .collect();
    const previousCandidate = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_owner_status_completed", (index) =>
        index
          .eq("ownerTokenIdentifier", checkIn.ownerTokenIdentifier)
          .eq("status", "complete")
          .lt("completedAt", checkIn.createdAt),
      )
      .order("desc")
      .filter((query) => query.neq(query.field("_id"), checkIn._id))
      .first();
    const previousCheckIn = selectMostRecentCompletedCheckIn(
      previousCandidate === null
        ? []
        : [
            {
              id: previousCandidate._id,
              ownerTokenIdentifier: previousCandidate.ownerTokenIdentifier,
              threadId: previousCandidate.threadId,
              status: previousCandidate.status,
              completedAt: previousCandidate.completedAt,
            },
          ],
      {
        currentCheckInId: checkIn._id,
        ownerTokenIdentifier: checkIn.ownerTokenIdentifier,
        currentCheckInCreatedAt: checkIn.createdAt,
      },
    );
    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "streaming",
      updatedAt: now,
    });
    await ctx.db.patch(checkIn._id, {
      generationState: "streaming",
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      checkInStreamingLeaseMs,
      internal.checkIn.expireGeneration,
      {
        submissionId: submission._id,
        attempt: args.attempt,
        expectedState: "streaming",
      },
    );

    return {
      checkInId: checkIn._id,
      ownerTokenIdentifier: checkIn.ownerTokenIdentifier,
      threadId: checkIn.threadId,
      promptMessageId: submission.promptMessageId,
      statusBeforeReply: submission.statusBeforeReply,
      islands: islands.map((island) => ({
        name: island.name,
        purpose: island.purpose,
      })),
      previousThreadId: previousCheckIn?.threadId ?? null,
    };
  },
});

export const completeGeneration = internalMutation({
  args: {
    submissionId: v.id("checkInSubmissions"),
    attempt: v.number(),
    decision: v.object({ status: checkInStatus }),
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

    const checkIn = await ctx.db.get(submission.checkInId);

    if (
      checkIn === null ||
      checkIn.activeSubmissionId !== submission._id ||
      checkIn.ownerTokenIdentifier !== submission.ownerTokenIdentifier
    ) {
      return null;
    }

    const nextStatus = resolveCheckInStatus(
      submission.statusBeforeReply,
      args.decision as CheckInCompletionDecision,
    );
    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "completed",
      retryRequestedAt: undefined,
      errorMessage: undefined,
      updatedAt: now,
    });
    await ctx.db.patch(checkIn._id, {
      status: nextStatus,
      generationState: "idle",
      activeSubmissionId: undefined,
      completedAt: nextStatus === "complete" ? now : undefined,
      updatedAt: now,
    });

    return null;
  },
});

export const failGeneration = internalMutation({
  args: {
    submissionId: v.id("checkInSubmissions"),
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

    const checkIn = await ctx.db.get(submission.checkInId);

    if (checkIn === null || checkIn.activeSubmissionId !== submission._id) {
      return null;
    }

    if (submission.retryRequestedAt !== undefined) {
      await queueSubmissionRetry(ctx, checkIn, submission);
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "failed",
      errorMessage: "Mindland couldn't finish that reply. Please retry.",
      updatedAt: now,
    });
    await ctx.db.patch(checkIn._id, {
      generationState: "failed",
      updatedAt: now,
    });

    return null;
  },
});

export const expireGeneration = internalMutation({
  args: {
    submissionId: v.id("checkInSubmissions"),
    attempt: v.number(),
    expectedState: v.union(v.literal("queued"), v.literal("streaming")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    const threshold =
      args.expectedState === "queued"
        ? checkInQueuedLeaseMs
        : checkInStreamingLeaseMs;

    if (
      submission === null ||
      submission.status !== args.expectedState ||
      submission.attempts !== args.attempt ||
      Date.now() - submission.updatedAt < threshold
    ) {
      return null;
    }

    const checkIn = await ctx.db.get(submission.checkInId);

    if (
      checkIn === null ||
      checkIn.activeSubmissionId !== submission._id ||
      checkIn.generationState !== args.expectedState
    ) {
      return null;
    }

    if (args.expectedState === "streaming") {
      if (submission.promptOrder === undefined) {
        return null;
      }

      const aborted = await abortStream(ctx, components.agent, {
        threadId: checkIn.threadId,
        order: submission.promptOrder,
        reason: "Mindland stale stream timeout",
      });

      if (aborted) {
        await ctx.db.patch(submission._id, {
          errorMessage: "Stopping the interrupted reply.",
          updatedAt: Date.now(),
        });
      }
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(submission._id, {
      status: "failed",
      errorMessage: "Mindland's reply was interrupted. Please retry.",
      updatedAt: now,
    });
    await ctx.db.patch(checkIn._id, {
      generationState: "failed",
      updatedAt: now,
    });

    return null;
  },
});
