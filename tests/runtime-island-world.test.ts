import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeIslandWorld,
  needsIslandMaterializationRepair,
  selectVisibleIslandWorld,
  type IslandVisualThemeKey,
  type OwnedIslandRecord,
} from "../src/data/islands.ts";
import { createIslandQuestionnaire } from "../src/lib/island-questionnaires.ts";

const record = (
  id: string,
  name: string,
  visualThemeKey: IslandVisualThemeKey,
  index: number,
): OwnedIslandRecord => ({
  id,
  islandKey: `interview:${index}:${name.toLocaleLowerCase()}`,
  name,
  purpose: `Grow ${name}`,
  visualThemeKey,
  visualSeed: 1_001 + index * 97,
  createdAt: 10_000 + index,
});

const discovered = [
  record("island-a1", "Sleep", "health", 0),
  record("unexpected-owned-id", "Study", "learning", 1),
  record("island-z9", "Fitness", "health", 2),
];

test("runtime world preserves exact discovered names, ids, and count", () => {
  const world = createRuntimeIslandWorld(discovered);
  assert.equal(world.islands.length, 3);
  assert.deepEqual(
    world.islands.map((island) => island.name),
    ["Sleep", "Study", "Fitness"],
  );
  assert.deepEqual(
    world.islands.map((island) => island.id),
    ["island-a1", "unexpected-owned-id", "island-z9"],
  );
  assert.equal(world.islandById["unexpected-owned-id"].name, "Study");
});

test("runtime world construction is deterministic across input order", () => {
  const first = createRuntimeIslandWorld(discovered);
  const second = createRuntimeIslandWorld([...discovered].reverse());
  assert.deepEqual(first, second);
  assert.equal(first.key, second.key);
});

test("empty revealed state never invents the former four islands", () => {
  const world = selectVisibleIslandWorld([], {
    onboardingActive: false,
    candidateCount: 4,
  });
  assert.equal(world.islands.length, 0);
  assert.equal(world.isPreview, false);
  assert.deepEqual(world.islandById, {});
});

test("onboarding previews use only unnamed candidate landforms", () => {
  const world = selectVisibleIslandWorld([], {
    onboardingActive: true,
    candidateCount: 8,
  });
  assert.equal(world.islands.length, 8);
  assert.equal(world.isPreview, true);
  assert.ok(world.islands.every((island) => island.name === ""));

  const capped = selectVisibleIslandWorld([], {
    onboardingActive: true,
    candidateCount: 99,
  });
  assert.equal(capped.islands.length, 8);
});

test("only finalized legacy accounts with candidates and no rows self-repair", () => {
  assert.equal(
    needsIslandMaterializationRepair({
      interviewStatus: "revealed",
      candidateCount: 3,
      ownedIslandCount: 0,
    }),
    true,
  );
  assert.equal(
    needsIslandMaterializationRepair({
      interviewStatus: "completed",
      candidateCount: 3,
      ownedIslandCount: 0,
    }),
    true,
  );
  assert.equal(
    needsIslandMaterializationRepair({
      interviewStatus: "interviewing",
      candidateCount: 3,
      ownedIslandCount: 0,
    }),
    false,
  );
  assert.equal(
    needsIslandMaterializationRepair({
      interviewStatus: "revealed",
      candidateCount: 3,
      ownedIslandCount: 1,
    }),
    false,
  );
});

test("questionnaires adapt to stored themes and arbitrary owned ids", () => {
  const world = createRuntimeIslandWorld(discovered);
  const sleepQuestions = createIslandQuestionnaire(
    world.islandById["island-a1"],
  );
  const studyQuestions = createIslandQuestionnaire(
    world.islandById["unexpected-owned-id"],
  );

  assert.ok(sleepQuestions.length >= 3 && sleepQuestions.length <= 7);
  assert.ok(studyQuestions.length >= 3 && studyQuestions.length <= 7);
  assert.match(sleepQuestions[0].prompt, /Sleep/);
  assert.match(studyQuestions[0].prompt, /Study/);
  assert.ok(
    studyQuestions.every((question) =>
      question.id.startsWith("unexpected-owned-id:"),
    ),
  );
});

test("saved agent questionnaires replace the theme fallback", () => {
  const customPrompt = "What helped your sleep routine feel calmer today?";
  const world = createRuntimeIslandWorld([
    {
      ...discovered[0],
      questionnaire: [
        {
          id: "island-a1:agent:1",
          prompt: customPrompt,
          kind: "choice",
          options: ["A lot", "A little", "Nothing yet"],
        },
        {
          id: "island-a1:agent:2",
          prompt: "What made sleep harder?",
          kind: "text",
          placeholder: "Something that happened…",
        },
        {
          id: "island-a1:agent:3",
          prompt: "When did you try to sleep?",
          kind: "time",
          placeholder: "22:30",
        },
      ],
    },
  ]);

  const questions = createIslandQuestionnaire(world.islands[0]);
  assert.equal(questions[0].prompt, customPrompt);
  assert.equal(questions[2].kind, "time");
});

test("every fallback asks gently about friction", () => {
  const world = createRuntimeIslandWorld(discovered);
  for (const island of world.islands) {
    const questions = createIslandQuestionnaire(island);
    assert.ok(
      questions.some((question) =>
        /hard|rough|drain|against|friction/i.test(
          `${question.prompt} ${question.options?.join(" ") ?? ""}`,
        ),
      ),
    );
  }
});
