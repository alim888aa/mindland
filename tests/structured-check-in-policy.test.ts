import assert from "node:assert/strict";
import test from "node:test";

import {
  isSameStructuredCheckInRequest,
  structuredClaimFailureMessage,
  structuredSubmissionRetryAction,
  structuredCheckInRequestBody,
} from "../src/domain/structured-check-in-policy.ts";

const request = {
  islandId: "fitness-island",
  answers: [
    {
      questionId: "duration",
      question: "How long did you run?",
      answer: "One hour",
    },
    {
      questionId: "company",
      question: "Were you with anyone?",
      answer: "A friend",
    },
  ],
};

test("an exact structured retry has one stable request body", () => {
  const stored = structuredCheckInRequestBody(request);
  assert.equal(isSameStructuredCheckInRequest(stored, request), true);
});

test("a terminal failed interpretation cannot be requeued forever", () => {
  assert.equal(
    structuredSubmissionRetryAction({
      status: "failed",
      interpretationAttempts: 3,
      retryLimit: 3,
    }),
    "terminal",
  );
  assert.equal(
    structuredSubmissionRetryAction({
      status: "failed",
      interpretationAttempts: 2,
      retryLimit: 3,
    }),
    "queue",
  );
});

test("the same request id cannot silently change an original answer", () => {
  const stored = structuredCheckInRequestBody(request);
  assert.equal(
    isSameStructuredCheckInRequest(stored, {
      ...request,
      answers: [
        request.answers[0],
        { ...request.answers[1], answer: "I ran alone" },
      ],
    }),
    false,
  );
});

test("a questionnaire crossing local midnight fails conclusively", () => {
  assert.match(
    structuredClaimFailureMessage({
      checkInExists: true,
      islandExists: true,
      checkInOwnedBySubmission: true,
      islandOwnedBySubmission: true,
      checkInDayIsCurrent: false,
    }) ?? "",
    /ended/,
  );
  assert.equal(
    structuredClaimFailureMessage({
      checkInExists: true,
      islandExists: true,
      checkInOwnedBySubmission: true,
      islandOwnedBySubmission: true,
      checkInDayIsCurrent: true,
    }),
    null,
  );
});

test("a questionnaire with an invalid owned source fails conclusively", () => {
  assert.match(
    structuredClaimFailureMessage({
      checkInExists: true,
      islandExists: true,
      checkInOwnedBySubmission: false,
      islandOwnedBySubmission: true,
      checkInDayIsCurrent: true,
    }) ?? "",
    /no longer available/,
  );
});
