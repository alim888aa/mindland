import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCheckInActivityInterpretation,
  prepareActivityApplicationInput,
} from "../src/domain/check-in-activity-interpretation.ts";

const options = {
  ownedIslandIds: new Set(["fitness", "relationships"]),
  userMessageIds: new Set(["message-1"]),
};

test("one activity can support several owned islands", () => {
  const result = parseCheckInActivityInterpretation(
    {
      activities: [
        {
          activity: "Ran with a friend",
          durationMinutes: 60,
          time: null,
          sentiment: "positive",
          tags: ["running", "friend"],
          sourceMessageIds: ["message-1"],
          islandEffects: [
            {
              islandId: "fitness",
              effect: "supportive",
              positiveDetailKey: "trailMarker",
            },
            {
              islandId: "relationships",
              effect: "supportive",
              positiveDetailKey: "warmLantern",
            },
          ],
        },
      ],
    },
    options,
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.value.activities[0].islandEffects.length, 2);
  }
});

test("interpretation rejects another owner's island or invented source message", () => {
  const base = {
    activity: "Ran",
    durationMinutes: null,
    time: null,
    sentiment: "positive",
    tags: ["run"],
    sourceMessageIds: ["message-1"],
    islandEffects: [
      {
        islandId: "fitness",
        effect: "supportive",
        positiveDetailKey: "trailMarker",
      },
    ],
  };

  assert.equal(
    parseCheckInActivityInterpretation(
      {
        activities: [
          {
            ...base,
            islandEffects: [
              {
                ...base.islandEffects[0],
                islandId: "someone-elses-island",
              },
            ],
          },
        ],
      },
      options,
    ).success,
    false,
  );
  assert.equal(
    parseCheckInActivityInterpretation(
      { activities: [{ ...base, sourceMessageIds: ["invented"] }] },
      options,
    ).success,
    false,
  );
});

test("supportive activity must choose one approved visual detail", () => {
  const result = parseCheckInActivityInterpretation(
    {
      activities: [
        {
          activity: "Ran",
          durationMinutes: 30,
          time: null,
          sentiment: "positive",
          tags: ["run"],
          sourceMessageIds: ["message-1"],
          islandEffects: [
            {
              islandId: "fitness",
              effect: "supportive",
              positiveDetailKey: "castle",
            },
          ],
        },
      ],
    },
    options,
  );

  assert.equal(result.success, false);
});

test("database application input consumes source ids without forwarding them", () => {
  const input = prepareActivityApplicationInput(
    {
      activity: "Strength training",
      durationMinutes: 45,
      time: null,
      sentiment: "positive",
      tags: ["strength"],
      sourceMessageIds: ["message-1"],
      islandEffects: [
        {
          islandId: "fitness",
          effect: "supportive",
          positiveDetailKey: "practiceMarker",
        },
      ],
    },
    new Map([["message-1", "I trained for 45 minutes."]]),
  );

  assert.equal("sourceMessageIds" in input, false);
  assert.deepEqual(input.originalEntries, [
    { messageId: "message-1", text: "I trained for 45 minutes." },
  ]);
});
