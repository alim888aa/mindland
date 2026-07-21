import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDailyIslandSignal,
  deriveIslandCondition,
  emptyIslandGrowthState,
  type IslandGrowthState,
} from "../src/domain/island-growth.ts";

function stateWith(
  positive: number,
  negative: number,
  isSunk = false,
): IslandGrowthState {
  const condition = deriveIslandCondition(positive, negative);
  return {
    lifetimePositivePoints: positive,
    lifetimeNegativePoints: negative,
    ...condition,
    isSunk,
    smallDetailKeys: [],
    milestoneDetailKeys: [],
  };
}

test("one island can gain several positive points but one negative point per day", () => {
  const first = applyDailyIslandSignal(
    emptyIslandGrowthState,
    null,
    {
      hasPositiveActivity: true,
      hasHarmfulActivity: true,
      summary: "Ran, then stayed up too late.",
      activityKeys: ["run", "late-night"],
      positiveDetailKey: "trailMarker",
    },
  );
  const merged = applyDailyIslandSignal(
    first.state,
    first.dailySummary,
    {
      hasPositiveActivity: true,
      hasHarmfulActivity: true,
      summary: "Also stretched and scrolled late.",
      activityKeys: ["stretch", "scroll"],
      positiveDetailKey: "sapling",
    },
  );

  assert.equal(merged.state.lifetimePositivePoints, 2);
  assert.equal(merged.state.lifetimeNegativePoints, 1);
  assert.equal(merged.delta.positivePoints, 1);
  assert.equal(merged.delta.negativePoints, 0);
  assert.deepEqual(merged.dailySummary.activityKeys, [
    "run",
    "late-night",
    "stretch",
    "scroll",
  ]);
});

test("demo growth caps positive points at twelve per island per day", () => {
  const result = applyDailyIslandSignal(emptyIslandGrowthState, null, {
    hasPositiveActivity: true,
    positiveActivityCount: 20,
    hasHarmfulActivity: false,
    summary: "A very active demo day.",
    activityKeys: Array.from({ length: 20 }, (_, index) => `activity-${index}`),
    positiveDetailKey: "sapling",
  });

  assert.equal(result.state.lifetimePositivePoints, 12);
  assert.equal(result.dailySummary.positivePointCount, 12);
  assert.equal(result.delta.positivePoints, 12);
  assert.equal(result.state.smallDetailKeys.length, 7);
});

test("five harmful days create one visible rock", () => {
  assert.deepEqual(deriveIslandCondition(10, 4), {
    rockCount: 0,
    growthStepCount: 5,
    isSunk: false,
  });
  assert.deepEqual(deriveIslandCondition(10, 5), {
    rockCount: 1,
    growthStepCount: 5,
    isSunk: false,
  });
});

test("twenty positives and five rocks remain above water", () => {
  assert.deepEqual(deriveIslandCondition(20, 25), {
    rockCount: 5,
    growthStepCount: 5,
    isSunk: false,
  });
});

test("twenty positives and twenty rocks sink", () => {
  assert.deepEqual(deriveIslandCondition(20, 100), {
    rockCount: 20,
    growthStepCount: 5,
    isSunk: true,
  });
});

test("the next lifetime positive point resurfaces a balanced island", () => {
  const result = applyDailyIslandSignal(
    stateWith(20, 100, true),
    null,
    {
      hasPositiveActivity: true,
      hasHarmfulActivity: false,
      summary: "Returned to the goal.",
      activityKeys: ["return"],
      positiveDetailKey: "warmLantern",
    },
  );

  assert.equal(result.state.lifetimePositivePoints, 21);
  assert.equal(result.state.rockCount, 20);
  assert.equal(result.state.isSunk, false);
  assert.equal(result.delta.resurfaced, true);
});

test("the first five positives grow land and later positives add one contextual prop", () => {
  assert.equal(deriveIslandCondition(0, 0).isSunk, false);
  const reachesMaximum = applyDailyIslandSignal(
    stateWith(4, 0),
    null,
    {
      hasPositiveActivity: true,
      hasHarmfulActivity: false,
      summary: "Practised today.",
      activityKeys: ["practice"],
      positiveDetailKey: "practiceMarker",
    },
  );

  assert.equal(reachesMaximum.state.growthStepCount, 5);
  assert.equal(reachesMaximum.delta.growthSteps, 1);
  assert.deepEqual(reachesMaximum.state.smallDetailKeys, []);
  assert.deepEqual(reachesMaximum.state.milestoneDetailKeys, []);

  const addsFirstProp = applyDailyIslandSignal(
    reachesMaximum.state,
    null,
    {
      hasPositiveActivity: true,
      hasHarmfulActivity: false,
      summary: "Practised again.",
      activityKeys: ["practice-again"],
      positiveDetailKey: "practiceMarker",
    },
  );

  assert.equal(addsFirstProp.state.lifetimePositivePoints, 6);
  assert.equal(addsFirstProp.state.growthStepCount, 5);
  assert.equal(addsFirstProp.delta.growthSteps, 0);
  assert.deepEqual(addsFirstProp.state.smallDetailKeys, ["practiceMarker"]);
});
