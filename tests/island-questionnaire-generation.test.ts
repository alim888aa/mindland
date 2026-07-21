import assert from "node:assert/strict";
import test from "node:test";

import {
  materializeGeneratedQuestions,
  parseGeneratedQuestionnaireBatch,
} from "../src/domain/island-questionnaire-generation.ts";

const islands = [
  { id: "island-sleep", islandKey: "interview:0" },
  { id: "island-study", islandKey: "interview:1" },
];

const question = (
  prompt: string,
  kind: "choice" | "text" | "number" | "time" = "choice",
) => ({
  prompt,
  detail: null,
  kind,
  options: kind === "choice" ? ["Yes", "No"] : [],
  placeholder: kind === "choice" ? null : kind === "time" ? "22:30" : "Answer…",
  unit: kind === "number" ? "minutes" : null,
});

test("one structured batch must cover every exact island once", () => {
  const parsed = parseGeneratedQuestionnaireBatch(
    {
      questionnaires: islands.map((island) => ({
        islandKey: island.islandKey,
        questions: [
          question("What moved forward today?"),
          question("What made this harder today?", "text"),
          question("When did this happen?", "time"),
        ],
      })),
    },
    islands,
  );
  assert.ok(parsed);
  assert.equal(parsed.questionnaires.length, 2);

  const duplicate = parseGeneratedQuestionnaireBatch(
    {
      questionnaires: [
        {
          islandKey: islands[0].islandKey,
          questions: [question("One"), question("Two"), question("Three")],
        },
        {
          islandKey: islands[0].islandKey,
          questions: [question("One"), question("Two"), question("Three")],
        },
      ],
    },
    islands,
  );
  assert.equal(duplicate, null);
});

test("materialized agent questions receive stable owned-island ids", () => {
  const parsed = parseGeneratedQuestionnaireBatch(
    {
      questionnaires: [
        {
          islandKey: islands[0].islandKey,
          questions: [
            question("What helped?", "text"),
            question("What got in the way?", "text"),
            question("When did you wind down?", "time"),
          ],
        },
      ],
    },
    [islands[0]],
  );
  assert.ok(parsed);
  const materialized = materializeGeneratedQuestions(
    islands[0].id,
    parsed.questionnaires[0].questions,
  );
  assert.deepEqual(
    materialized.map((item) => item.id),
    [
      "island-sleep:agent:1",
      "island-sleep:agent:2",
      "island-sleep:agent:3",
    ],
  );
  assert.equal(materialized[2].kind, "time");
});
