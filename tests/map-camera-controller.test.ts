import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelCameraTransition,
  clampCameraPoseToWorld,
  createHomeCameraTarget,
  createIslandCameraTarget,
  createWorldCameraTarget,
  expandBoundsToContainCameraPose,
  followMovingFocalPoint,
  getCameraTransitionResponseRate,
  ISLAND_ENTRY_CAMERA_RESPONSE_RATE,
  OVERVIEW_CAMERA_RESPONSE_RATE,
  preserveFocalPointWhileZooming,
  stepCameraPose,
} from "../src/lib/map-camera-controller.ts";

test("overview easing is calmer while island entry keeps its pace", () => {
  assert.equal(
    getCameraTransitionResponseRate("health"),
    ISLAND_ENTRY_CAMERA_RESPONSE_RATE,
  );
  assert.equal(
    getCameraTransitionResponseRate(null),
    OVERVIEW_CAMERA_RESPONSE_RATE,
  );
  assert.ok(OVERVIEW_CAMERA_RESPONSE_RATE < ISLAND_ENTRY_CAMERA_RESPONSE_RATE);
  const timeToOnePercentAtEntryRate =
    Math.log(100) / ISLAND_ENTRY_CAMERA_RESPONSE_RATE;
  const timeToOnePercentAtOverviewRate =
    Math.log(100) / OVERVIEW_CAMERA_RESPONSE_RATE;
  assert.ok(
    Math.abs(
      timeToOnePercentAtOverviewRate - timeToOnePercentAtEntryRate - 0.2,
    ) < 0.01,
  );
});

test("cancelling a transition preserves the exact rendered pose", () => {
  const current = { center: { x: 2.4, z: -1.7 }, distance: 4.25 };
  const frozen = cancelCameraTransition(current);
  assert.deepEqual(frozen, current);
  assert.notEqual(frozen, current);
  assert.notEqual(frozen.center, current.center);
});

test("a pinch that interrupts motion begins from the rendered pose", () => {
  const rendered = { center: { x: 1.2, z: -0.8 }, distance: 6 };
  const futureTarget = { center: { x: 4, z: 3 }, distance: 2 };
  const frozen = cancelCameraTransition(rendered);
  const focal = { x: 2.2, z: 0.2 };
  const zoomed = preserveFocalPointWhileZooming(
    frozen,
    focal,
    frozen.distance / 1.2,
    { minimum: 1, maximum: 10 },
  );

  assert.equal(zoomed.distance, 5);
  assert.notDeepEqual(zoomed.center, futureTarget.center);
  assert.ok(
    Math.abs(
      (focal.x - rendered.center.x) / rendered.distance -
        (focal.x - zoomed.center.x) / zoomed.distance,
    ) < 1e-12,
  );
});

const footprint = { minX: -1, maxX: 1, minZ: -1.5, maxZ: 0.5 };
const range = { minimum: 1, maximum: 10 };
const world = { minX: -10, maxX: 10, minZ: -8, maxZ: 8 };

test("world target frames the full perimeter", () => {
  const target = createWorldCameraTarget(world, footprint, range);
  assert.equal(target.distance, 10);
  assert.deepEqual(target.center, { x: 0, z: 5 });
});

test("island target centers an asymmetric footprint on its territory", () => {
  const target = createIslandCameraTarget(
    { minX: 3, maxX: 7, minZ: -2, maxZ: 2 },
    footprint,
    range,
    1,
  );
  assert.equal(target.distance, 2);
  assert.deepEqual(target.center, { x: 5, z: 1 });
});

test("home target chooses at most five stable central islands", () => {
  const subjects = [
    { id: "far", position: { x: 9, z: 0 }, radius: 0.5 },
    ...[0, 1, 2, 3, 4].map((index) => ({
      id: `center-${index}`,
      position: { x: index - 2, z: 0 },
      radius: 0.5,
    })),
  ];
  const target = createHomeCameraTarget(subjects, world, footprint, range);
  assert.equal(target.subjectIds.length, 5);
  assert.equal(target.subjectIds.includes("far"), false);
});

test("focal point remains fixed in normalized ground space", () => {
  const pose = { center: { x: 4, z: 2 }, distance: 8 };
  const focal = { x: 2, z: -2 };
  const zoomed = preserveFocalPointWhileZooming(pose, focal, 4, range);
  assert.deepEqual(zoomed, { center: { x: 3, z: 0 }, distance: 4 });
  assert.equal(
    (focal.x - pose.center.x) / pose.distance,
    (focal.x - zoomed.center.x) / zoomed.distance,
  );
  assert.equal(
    (focal.z - pose.center.z) / pose.distance,
    (focal.z - zoomed.center.z) / zoomed.distance,
  );
});

test("a moving pinch midpoint carries its original world anchor", () => {
  const zoomed = { center: { x: 3, z: 0 }, distance: 4 };
  const followed = followMovingFocalPoint(
    zoomed,
    { x: 2, z: -2 },
    { x: 1.5, z: -1.25 },
  );
  assert.deepEqual(followed, {
    center: { x: 3.5, z: -0.75 },
    distance: 4,
  });
});

test("pose clamping accounts for zoom footprint", () => {
  const clamped = clampCameraPoseToWorld(
    { center: { x: 100, z: -100 }, distance: 2 },
    world,
    footprint,
    range,
  );
  assert.deepEqual(clamped, { center: { x: 8, z: -5 }, distance: 2 });
});

test("centered home pose remains stable when panning begins", () => {
  const centeredHome = { center: { x: 0, z: 0 }, distance: 10 };
  const asymmetricFootprint = {
    minX: -0.5,
    maxX: 0.5,
    minZ: -0.4,
    maxZ: 0.8,
  };
  const tightWorld = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
  const navigationBounds = expandBoundsToContainCameraPose(
    tightWorld,
    asymmetricFootprint,
    centeredHome,
  );

  assert.deepEqual(navigationBounds, {
    minX: -5,
    maxX: 5,
    minZ: -5,
    maxZ: 8,
  });
  assert.deepEqual(
    clampCameraPoseToWorld(
      centeredHome,
      navigationBounds,
      asymmetricFootprint,
      { minimum: 2, maximum: 10 },
    ),
    centeredHome,
  );
});

test("easing is independent of frame subdivision", () => {
  const current = { center: { x: 0, z: 0 }, distance: 10 };
  const target = { center: { x: 5, z: -3 }, distance: 2 };
  const oneStep = stepCameraPose(current, target, 1, 4);
  const firstHalf = stepCameraPose(current, target, 0.5, 4);
  const twoSteps = stepCameraPose(firstHalf, target, 0.5, 4);
  assert.ok(Math.abs(oneStep.center.x - twoSteps.center.x) < 1e-12);
  assert.ok(Math.abs(oneStep.center.z - twoSteps.center.z) < 1e-12);
  assert.ok(Math.abs(oneStep.distance - twoSteps.distance) < 1e-12);
});
