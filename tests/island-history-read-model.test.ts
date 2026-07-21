import assert from "node:assert/strict";
import test from "node:test";

import {
  conditionFromStoredGrowth,
  effectForIsland,
  exactOriginalEntries,
  islandHistoryPageSize,
  isOwnedHistoryResource,
} from "../src/domain/island-history.ts";

test("history pagination stays useful and bounded", () => {
  assert.equal(islandHistoryPageSize(0), 1);
  assert.equal(islandHistoryPageSize(12.9), 12);
  assert.equal(islandHistoryPageSize(500), 30);
});

test("history resources remain private to their stored owner", () => {
  const island = { ownerTokenIdentifier: "owner-a" };

  assert.equal(isOwnedHistoryResource(island, "owner-a"), true);
  assert.equal(isOwnedHistoryResource(island, "owner-b"), false);
  assert.equal(isOwnedHistoryResource(null, "owner-a"), false);
});

test("summary condition reads the stored sunk state without rescoring", () => {
  assert.equal(conditionFromStoredGrowth(null), "aboveWater");
  assert.equal(conditionFromStoredGrowth({ isSunk: false }), "aboveWater");
  assert.equal(conditionFromStoredGrowth({ isSunk: true }), "sunk");
});

test("history exposes only the effect belonging to the requested island", () => {
  const effects = [
    { islandId: "fitness", effect: "supportive" as const },
    { islandId: "relationships", effect: "both" as const },
  ];

  assert.deepEqual(effectForIsland(effects, "fitness"), effects[0]);
  assert.equal(effectForIsland(effects, "learning"), null);
});

test("daily history preserves exact entries and their structured source", () => {
  const entries = exactOriginalEntries([
    {
      originalEntries: [{ messageId: "message-1", text: "Ran with Mia." }],
    },
    {
      structuredSubmissionId: "submission-1",
      originalEntries: [
        { messageId: "answer-1", text: "I slept for seven hours." },
      ],
    },
    {
      structuredSubmissionId: "submission-1",
      originalEntries: [
        { messageId: "answer-1", text: "I slept for seven hours." },
      ],
    },
  ]);

  assert.deepEqual(entries, [
    {
      messageId: "message-1",
      text: "Ran with Mia.",
      sourceKind: "conversation",
      structuredSubmissionId: null,
    },
    {
      messageId: "answer-1",
      text: "I slept for seven hours.",
      sourceKind: "structuredQuestionnaire",
      structuredSubmissionId: "submission-1",
    },
  ]);
});
