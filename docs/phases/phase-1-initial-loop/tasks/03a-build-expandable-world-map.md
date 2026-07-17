# Build the expandable world map

Status: in-progress

Owner: map-world-agent

Depends on: Create initial islands

## Outcome

Turn the current fixed composition into a bounded world that the user can move through horizontally and vertically and that gains more space as islands are added.

## Current slice

Refactor the prototype around world coordinates, make the starting islands visibly smaller, add smooth two-axis camera movement with bounded edges, and make the existing layout and territories derive from variable island data so later AI-created islands can reflow the world.

## Done when

The user can navigate the world smoothly on iPhone, encounter a clear outer perimeter, and add related islands without collisions while existing island positions and territories adjust coherently.

## Result

Implemented the current slice around explicit world coordinates. The renderer now consumes a deterministic variable-island layout, scales the four initial islands down in the overview, draws generated Voronoi-like territory borders and an expandable outer perimeter, projects island labels from the 3D camera, and supports bounded two-axis drag movement with eased following and release momentum.

The layout keeps related islands near each other, pushes overlapping territories apart, and recalculates world bounds and territory cells when another island is supplied. Current numeric values for camera speed, inertia, visible camera footprint, edge padding, spacing, iteration count, territory radius, and overview scale are prototype tuning constants. They still need simulator tuning before becoming product rules.

Reviewer follow-up added a deterministic collision-only cleanup pass after all attraction forces, a pure minimum-clearance helper, smooth selection from the currently panned camera, and cleared pan state during that transition. Territory rendering now draws each shared straight Voronoi edge once and draws the perimeter once, avoiding stacked transparent geometry and curved-line divergence.

## Verification

Passed a focused Node layout exercise covering related-island placement, collision clearance, expanded bounds, and valid territory polygons. `git diff --check` passed.

The live iPhone 16 simulator hot-reloaded the refactor successfully. The smaller four-island overview, generated territory lines, dynamic labels, and selected-island zoom were visually verified. Computer-driven drag gestures could not be completed because Simulator interaction was unavailable, so pan feel still needs a short hands-on device pass.

The reviewer fixes were inspected locally. A full TypeScript check and iOS export were attempted but stalled without output in the current prototype tooling. The generated boundaries use simple WebGPU cylinder meshes rather than new tubes.

## Commit

`c235451` — `feat: make island world expandable`
