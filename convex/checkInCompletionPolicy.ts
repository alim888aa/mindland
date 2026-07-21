export type CheckInStatus =
  | "collecting"
  | "awaitingConfirmation"
  | "complete";

export type CheckInCompletionDecision = {
  status: CheckInStatus;
};

export function parseCheckInCompletionDecision(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return { success: false as const, error: new Error("Expected an object.") };
  }

  const status = (value as Record<string, unknown>).status;

  if (
    status !== "collecting" &&
    status !== "awaitingConfirmation" &&
    status !== "complete"
  ) {
    return {
      success: false as const,
      error: new Error("The check-in completion decision was invalid."),
    };
  }

  return {
    success: true as const,
    value: { status },
  };
}

export function resolveCheckInStatus(
  statusBeforeReply: Exclude<CheckInStatus, "complete">,
  decision: CheckInCompletionDecision,
): CheckInStatus {
  if (decision.status === "complete") {
    return statusBeforeReply === "awaitingConfirmation"
      ? "complete"
      : "awaitingConfirmation";
  }

  return decision.status;
}
