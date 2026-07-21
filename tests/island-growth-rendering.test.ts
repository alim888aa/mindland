import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeIslandWorld,
  type IslandGrowthRecord,
  type OwnedIslandRecord,
} from "../src/data/islands.ts";
import {
  calculateIslandLandScale,
  createWorldRenderBudgets,
  earnedPropCount,
  MAX_RENDERED_MILESTONE_DETAILS,
  MAX_RENDERED_ROCKS,
  MAX_RENDERED_SMALL_DETAILS,
} from "../src/lib/island-growth-rendering.ts";

const island: OwnedIslandRecord = {
  id: "island-sleep",
  islandKey: "interview:0:sleep",
  name: "Sleep",
  purpose: "Build a healthier sleep rhythm",
  visualThemeKey: "health",
  visualSeed: 7_401,
  createdAt: 1_000,
};

const growth = (value: Partial<IslandGrowthRecord> = {}): IslandGrowthRecord => ({
  islandId: "island-sleep",
  lifetimePositivePoints: 12,
  lifetimeNegativePoints: 6,
  rockCount: 1,
  growthStepCount: 2,
  isSunk: false,
  smallDetailKeys: ["warmLantern", "restBench"],
  milestoneDetailKeys: ["grove", "windingPath"],
  updatedAt: 2_000,
  ...value,
});

test("land growth stays at the starter footprint while the maximum-step choice is open", () => {
  assert.equal(
    calculateIslandLandScale({
      growthStepCount: 99,
      startingLandScale: 0.3,
      maximumLandScale: 0.8,
      growthStepsToMaximum: null,
    }),
    0.3,
  );
  assert.equal(
    calculateIslandLandScale({
      growthStepCount: 99,
      startingLandScale: 0.3,
      maximumLandScale: 0.8,
      growthStepsToMaximum: 0,
    }),
    0.3,
  );
});

test("land growth interpolates and caps when a maximum-step choice is supplied", () => {
  assert.equal(
    calculateIslandLandScale({
      growthStepCount: 0,
      startingLandScale: 0.3,
      maximumLandScale: 0.8,
      growthStepsToMaximum: 5,
    }),
    0.3,
  );
  assert.equal(
    calculateIslandLandScale({
      growthStepCount: 2,
      startingLandScale: 0.3,
      maximumLandScale: 0.8,
      growthStepsToMaximum: 5,
    }),
    0.5,
  );
  assert.equal(
    calculateIslandLandScale({
      growthStepCount: 50,
      startingLandScale: 0.3,
      maximumLandScale: 0.8,
      growthStepsToMaximum: 5,
    }),
    0.8,
  );
});

test("owned island growth joins by exact island id and preserves stored state", () => {
  const world = createRuntimeIslandWorld([island], [
    growth({
      rockCount: 27,
      isSunk: true,
      smallDetailKeys: ["bookStack", "practiceMarker"],
    }),
  ]);
  const rendered = world.islandById[island.id];

  assert.equal(rendered.growth.lifetimePositivePoints, 12);
  assert.equal(rendered.growth.lifetimeNegativePoints, 6);
  assert.equal(rendered.growth.rockCount, 27);
  assert.equal(rendered.growth.growthStepCount, 2);
  assert.equal(rendered.growth.isSunk, true);
  assert.deepEqual(rendered.growth.smallDetailKeys, [
    "bookStack",
    "practiceMarker",
  ]);
  assert.deepEqual(rendered.growth.milestoneDetailKeys, [
    "grove",
    "windingPath",
  ]);
  assert.equal(rendered.landScale, rendered.maximumLandScale);
});

test("missing and unrelated ledgers keep an owned island at a bare zero state", () => {
  const world = createRuntimeIslandWorld(
    [island],
    [growth({ islandId: "another-island" })],
  );
  const rendered = world.islandById[island.id];

  assert.equal(rendered.growth.lifetimePositivePoints, 0);
  assert.equal(rendered.growth.rockCount, 0);
  assert.equal(rendered.growth.isSunk, false);
  assert.deepEqual(rendered.growth.smallDetailKeys, []);
  assert.deepEqual(rendered.growth.milestoneDetailKeys, []);
  assert.equal(rendered.landScale, 0.42);
});

test("visual changes alter the world key so live query updates rebuild the scene", () => {
  const first = createRuntimeIslandWorld([island], [growth()]);
  const second = createRuntimeIslandWorld(
    [island],
    [growth({ rockCount: 2, isSunk: true })],
  );
  const resurfaced = createRuntimeIslandWorld(
    [island],
    [growth({ rockCount: 2, isSunk: false })],
  );

  assert.notEqual(first.key, second.key);
  assert.notEqual(second.key, resurfaced.key);
  assert.equal(first.identityKey, second.identityKey);
  assert.equal(second.identityKey, resurfaced.identityKey);
});

test("island ownership changes alter the parent experience identity", () => {
  const first = createRuntimeIslandWorld([island], [growth()]);
  const secondIsland: OwnedIslandRecord = {
    ...island,
    id: "island-study",
    islandKey: "interview:1:study",
    name: "Study",
    visualThemeKey: "learning",
    createdAt: 2_000,
  };
  const second = createRuntimeIslandWorld([island, secondIsland], [growth()]);

  assert.notEqual(first.identityKey, second.identityKey);
});

test("renderer mesh caps stay bounded while runtime state keeps full counts", () => {
  assert.equal(MAX_RENDERED_SMALL_DETAILS, 24);
  assert.equal(MAX_RENDERED_MILESTONE_DETAILS, 2);
  assert.equal(MAX_RENDERED_ROCKS, 8);

  const manyDetails = Array.from({ length: 60 }, () => "sapling" as const);
  const world = createRuntimeIslandWorld(
    [island],
    [
      growth({
        rockCount: 80,
        smallDetailKeys: manyDetails,
      }),
    ],
  );

  assert.equal(world.islandById[island.id].growth.rockCount, 80);
  assert.equal(
    world.islandById[island.id].growth.smallDetailKeys.length,
    60,
  );
});

test("props begin after the five land-growth points", () => {
  assert.equal(earnedPropCount(0), 0);
  assert.equal(earnedPropCount(5), 0);
  assert.equal(earnedPropCount(6), 1);
  assert.equal(earnedPropCount(12), 7);
});

test("a twenty-island world has a bounded stable GPU item budget", () => {
  const requests = Array.from({ length: 20 }, (_, index) => ({
    id: `island-${index}`,
    smallDetails: 100,
    milestoneDetails: 100,
    rocks: 100,
  }));
  const budgets = createWorldRenderBudgets(requests);
  const values = Object.values(budgets);

  assert.equal(
    values.reduce((total, value) => total + value.smallDetails, 0),
    20 * MAX_RENDERED_SMALL_DETAILS,
  );
  assert.equal(
    values.reduce((total, value) => total + value.milestoneDetails, 0),
    20 * MAX_RENDERED_MILESTONE_DETAILS,
  );
  assert.equal(
    values.reduce((total, value) => total + value.rocks, 0),
    20 * MAX_RENDERED_ROCKS,
  );
  assert.ok(
    values.every(
      (value) =>
        value.smallDetails <= MAX_RENDERED_SMALL_DETAILS &&
        value.milestoneDetails <= MAX_RENDERED_MILESTONE_DETAILS &&
        value.rocks <= MAX_RENDERED_ROCKS,
    ),
  );
});

test("growth on another island never removes an established island's visuals", () => {
  const established = {
    id: "established",
    smallDetails: 100,
    milestoneDetails: 100,
    rocks: 100,
  };
  const before = createWorldRenderBudgets([established]);
  const after = createWorldRenderBudgets([
    established,
    {
      id: "new-growth",
      smallDetails: 100,
      milestoneDetails: 100,
      rocks: 100,
    },
  ]);

  assert.deepEqual(after.established, before.established);
});
