# Build the map camera controller

Status: completed

Owner: map-camera-agent

Depends on: Add real map camera and compact territories

## Outcome

Provide deterministic camera math for real zoom levels, focal-point anchoring, home framing, close-up framing, and zoom-aware navigation bounds.

## Done when

The camera state and transition math live outside React and the renderer. The controller can clamp zoom, animate toward a target with frame-rate-independent motion, preserve a focal world point while zooming, and expose a stable home pose for up to five central islands.

## Result

Added a renderer-independent TypeScript camera controller. It models the camera as a ground center plus distance, frames the world, a territory, or up to five central islands, preserves the touched world point during pinch zoom, clamps zoom-aware movement to the world perimeter, and eases transitions independently of frame rate.

The WebGPU integration can measure one ground footprint from its real angled camera, pass that unit footprint into the controller, and then convert the returned center and distance into Three.js position and target vectors. Gesture and renderer code do not need to duplicate camera math.

## Verification

`node --test tests/map-camera-controller.test.ts tests/world-layout.test.ts` passes all 28 camera and territory tests, including six camera-math tests and territory invariants from three through twenty islands.

The complete iOS dev build and runtime bundling pass. The repo-wide TypeScript command still reports older errors outside this controller and its integration.

## Commit

Blocked by the same iCloud-offloaded Git metadata recorded in task 03d.
