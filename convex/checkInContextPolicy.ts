export const maximumCarriedCheckInMessages = 40;
export const maximumExaminedPreviousCheckInMessages = 200;

type CompletedCheckInCandidate = {
  id: string;
  ownerTokenIdentifier: string;
  threadId: string;
  status: "collecting" | "awaitingConfirmation" | "complete";
  completedAt?: number;
};

type HistoricalMessageCandidate = {
  role: string;
  text?: string;
  order: number;
  stepOrder: number;
};

export type CarriedCheckInMessage = {
  role: "user" | "assistant";
  text: string;
};

export function selectMostRecentCompletedCheckIn(
  candidates: ReadonlyArray<CompletedCheckInCandidate>,
  options: {
    currentCheckInId: string;
    ownerTokenIdentifier: string;
    currentCheckInCreatedAt: number;
  },
) {
  return (
    candidates
      .filter(
        (candidate) =>
          candidate.id !== options.currentCheckInId &&
          candidate.ownerTokenIdentifier === options.ownerTokenIdentifier &&
          candidate.status === "complete" &&
          candidate.completedAt !== undefined &&
          candidate.completedAt < options.currentCheckInCreatedAt,
      )
      .sort((left, right) => right.completedAt! - left.completedAt!)[0] ?? null
  );
}

export function carryLatestCheckInMessages(
  messages: ReadonlyArray<HistoricalMessageCandidate>,
  limit = maximumCarriedCheckInMessages,
): CarriedCheckInMessage[] {
  if (limit <= 0) return [];

  return messages
    .filter(
      (message): message is HistoricalMessageCandidate & {
        role: "user" | "assistant";
        text: string;
      } =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string" &&
        message.text.trim().length > 0,
    )
    .sort((left, right) =>
      left.order === right.order
        ? left.stepOrder - right.stepOrder
        : left.order - right.order,
    )
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      text: message.text.trim(),
    }));
}
