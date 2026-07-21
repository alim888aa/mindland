import assert from "node:assert/strict";
import test from "node:test";

import {
  answersForStructuredCheckIn,
  questionnaireAnswer,
} from "../src/lib/questionnaire-submission.ts";

test("questionnaire records preserve prompt, kind, skip, and exact answer", () => {
  const answered = questionnaireAnswer(
    {
      id: "fitness:minutes",
      prompt: "How long did you run?",
      kind: "number",
      placeholder: "30",
      unit: "minutes",
    },
    " 45 ",
    false,
  );
  const skipped = questionnaireAnswer(
    {
      id: "fitness:note",
      prompt: "Anything else?",
      kind: "text",
      placeholder: "A short note",
    },
    null,
    true,
  );

  assert.deepEqual(answered, {
    questionId: "fitness:minutes",
    prompt: "How long did you run?",
    kind: "number",
    skipped: false,
    answer: " 45 ",
  });
  assert.deepEqual(answersForStructuredCheckIn([answered, skipped]), [
    {
      questionId: "fitness:minutes",
      question: "How long did you run?\nInput kind: number\nSkipped: no",
      answer: " 45 ",
    },
    {
      questionId: "fitness:note",
      question: "Anything else?\nInput kind: text\nSkipped: yes",
      answer: null,
    },
  ]);
});
