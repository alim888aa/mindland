export type StructuredCheckInAnswer = {
  questionId: string;
  question: string;
  answer: string | null;
};

export function structuredCheckInRequestBody(input: {
  islandId: string;
  answers: ReadonlyArray<StructuredCheckInAnswer>;
}) {
  return JSON.stringify({
    islandId: input.islandId,
    answers: input.answers.map((answer) => ({
      questionId: answer.questionId,
      question: answer.question,
      answer: answer.answer,
    })),
  });
}

export function isSameStructuredCheckInRequest(
  storedRequestBody: string,
  input: {
    islandId: string;
    answers: ReadonlyArray<StructuredCheckInAnswer>;
  },
) {
  return storedRequestBody === structuredCheckInRequestBody(input);
}

export function structuredSubmissionRetryAction(input: {
  status: "queued" | "interpreting" | "applied" | "failed";
  interpretationAttempts: number;
  retryLimit: number;
}) {
  if (input.status !== "failed") return "wait" as const;
  return input.interpretationAttempts >= input.retryLimit
    ? ("terminal" as const)
    : ("queue" as const);
}

export function structuredClaimFailureMessage(input: {
  checkInExists: boolean;
  islandExists: boolean;
  checkInOwnedBySubmission: boolean;
  islandOwnedBySubmission: boolean;
  checkInDayIsCurrent: boolean;
}) {
  if (
    !input.checkInExists ||
    !input.islandExists ||
    !input.checkInOwnedBySubmission ||
    !input.islandOwnedBySubmission
  ) {
    return "That guided check-in source is no longer available.";
  }

  if (!input.checkInDayIsCurrent) {
    return "That daily check-in ended before Mindland could apply it. Start a new check-in.";
  }

  return null;
}
