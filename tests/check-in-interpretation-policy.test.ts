import assert from "node:assert/strict";
import test from "node:test";

import {
  conversationInterpretationOrNull,
  conversationInterpretationSourceKey,
} from "../src/domain/check-in-interpretation-policy.ts";

test("each conversation completion cycle receives a distinct source key", () => {
  assert.equal(
    conversationInterpretationSourceKey("check-in-1", 100),
    "conversation:check-in-1:100",
  );
  assert.notEqual(
    conversationInterpretationSourceKey("check-in-1", 100),
    conversationInterpretationSourceKey("check-in-1", 200),
  );
});

test("an owned check-in without a conversation interpretation returns null", () => {
  assert.equal(conversationInterpretationOrNull([]), null);
  assert.equal(
    conversationInterpretationOrNull([
      { sourceKind: "structuredQuestionnaire", createdAt: 1, status: "applied" },
    ]),
    null,
  );
});

test("the newest conversation completion cycle controls application status", () => {
  const older = { sourceKind: "conversation", createdAt: 10, status: "applied" };
  const newer = { sourceKind: "conversation", createdAt: 20, status: "interpreting" };
  assert.equal(
    conversationInterpretationOrNull([
      newer,
      { sourceKind: "structuredQuestionnaire", createdAt: 30, status: "applied" },
      older,
    ]),
    newer,
  );
});

test("the conversation interpretation is selected among structured sources", () => {
  const conversation = { sourceKind: "conversation", createdAt: 2, status: "applied" };
  assert.equal(
    conversationInterpretationOrNull([
      { sourceKind: "structuredQuestionnaire", createdAt: 1, status: "applied" },
      conversation,
    ]),
    conversation,
  );
});
